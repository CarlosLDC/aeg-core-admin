"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Printer, RefreshCw, RotateCcw, Zap } from "lucide-react";
import { useToast } from "@/context/toast-provider";
import { fetchPrinterById, fetchPrinters } from "@/lib/printers-api";
import { fetchBranchById } from "@/lib/branches-api";
import { fetchClientById } from "@/lib/clients-api";
import { fetchCompanyById } from "@/lib/companies-api";
import {
  getMqttErrorMessage,
  precheckEnajenacionMqtt,
  updateMqttSubscription,
} from "@/lib/mqtt-api";
import {
  ServerCommandBlock,
  SimulatePrinterButton,
} from "@/components/mqtt/enajenacion-step-actions";
import {
  ENAJENACION_FLOW_STEPS,
  buildEnajenacionCommandContextFromClientData,
  buildPrinterSimulationPayload,
  compactMac,
  type EnajenacionCommandContext,
  detectPrinterResponseStep,
  detectServerCommandStep,
  filterFiscalMessagesSince,
  findLatestPtrEnajenarReceivedAt,
  findLatestServerCommand,
  fiscalCmdServerTopic,
  fiscalComandoTopic,
  fiscalMonitorTopic,
  fiscalTopicMatchesMac,
  isFiscalCmdServerTopic,
  isPrinterEligibleForEnajenacionTest,
  parseMessageReceivedAt,
  resolveWfileResponseStep,
} from "@/lib/enajenacion-mqtt-protocol";
import { printerStatusLabel } from "@/lib/printer-status";
import type { PrinterResponse } from "@/types/printer";
import type { MqttInboundMessage } from "@/types/mqtt";
import { cn } from "@/lib/utils";

type StepStatus = "pending" | "success";

type RitualStep = {
  id: string;
  label: string;
  description: string;
  topic: string;
  successHint: string;
  isRequest: boolean;
};

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

function stepStatusLabel(
  status: StepStatus,
  stepId: string,
  hasServerCommand: boolean,
): string {
  if (status === "success") {
    return stepId === "request" ? "Solicitud recibida" : "Impresora respondió";
  }
  if (stepId === "request") {
    return "Listo para iniciar";
  }
  return hasServerCommand ? "Esperando impresora" : "Esperando AEG Core";
}

function formatAnchorTime(anchorAt: number): string {
  return new Date(anchorAt).toLocaleString();
}

export function EnajenacionTestPanel({
  liveMessages,
  onApplyMonitorTopic,
  onOpenMonitor,
}: {
  liveMessages: MqttInboundMessage[];
  onApplyMonitorTopic?: (topic: string) => Promise<void>;
  onOpenMonitor?: () => void;
}) {
  const toast = useToast();
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [printersLoading, setPrintersLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [printerStatus, setPrinterStatus] = useState<PrinterResponse | null>(
    null,
  );
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>(
    {},
  );
  const [precheck, setPrecheck] = useState<{
    ready: boolean;
    message: string | null;
  } | null>(null);
  const [precheckLoading, setPrecheckLoading] = useState(false);
  /** Ancla manual tras «Reiniciar seguimiento»; se descarta si llega un ptrEnajenar más nuevo. */
  const [manualTrackingAnchorAt, setManualTrackingAnchorAt] = useState<
    number | null
  >(null);
  const [commandContext, setCommandContext] =
    useState<EnajenacionCommandContext | null>(null);
  const [commandContextLoading, setCommandContextLoading] = useState(false);
  const [commandContextError, setCommandContextError] = useState<string | null>(
    null,
  );
  /** Pasos cuya respuesta se publicó desde el panel (aunque el monitor no la refleje aún). */
  const [panelAcknowledgedSteps, setPanelAcknowledgedSteps] = useState<
    Set<string>
  >(() => new Set());

  const eligiblePrinters = useMemo(
    () => printers.filter(isPrinterEligibleForEnajenacionTest),
    [printers],
  );

  const activePrinter = useMemo(
    () => eligiblePrinters.find((p) => p.id === selectedId) ?? null,
    [eligiblePrinters, selectedId],
  );

  const topics = useMemo(() => {
    if (!activePrinter?.macAddress) return null;
    const mac = compactMac(activePrinter.macAddress);
    return {
      mac,
      cmdServer: fiscalCmdServerTopic(mac),
      comando: fiscalComandoTopic(mac),
      monitor: fiscalMonitorTopic(mac),
    };
  }, [activePrinter]);

  const ritualSteps = useMemo<RitualStep[]>(() => {
    if (!topics) return [];
    return ENAJENACION_FLOW_STEPS.map((flow) => ({
      id: flow.id,
      label: `${flow.step}. ${flow.name}`,
      description: flow.purpose,
      topic: flow.id === "request" ? topics.cmdServer : topics.comando,
      successHint: flow.successCriteria.join(" "),
      isRequest: flow.id === "request",
    }));
  }, [topics]);

  const autoPtrEnajenarAnchorAt = useMemo(() => {
    if (!topics) return null;
    return findLatestPtrEnajenarReceivedAt(liveMessages, topics.mac);
  }, [liveMessages, topics]);

  const ritualAnchorAt = useMemo(() => {
    if (manualTrackingAnchorAt !== null) {
      if (
        autoPtrEnajenarAnchorAt !== null &&
        autoPtrEnajenarAnchorAt > manualTrackingAnchorAt
      ) {
        return autoPtrEnajenarAnchorAt;
      }
      return manualTrackingAnchorAt;
    }
    return autoPtrEnajenarAnchorAt;
  }, [autoPtrEnajenarAnchorAt, manualTrackingAnchorAt]);

  const ritualMessages = useMemo(() => {
    if (!topics || ritualAnchorAt === null) return [];
    return filterFiscalMessagesSince(liveMessages, topics.mac, ritualAnchorAt);
  }, [liveMessages, topics, ritualAnchorAt]);

  const completedRitualSteps = useMemo(() => {
    if (!topics || ritualAnchorAt === null) return new Set<string>();
    const done = new Set<string>();
    let wfileResponseIndex = 0;
    const chronological = [...ritualMessages].sort(
      (a, b) =>
        (parseMessageReceivedAt(a.receivedAt) ?? 0) -
        (parseMessageReceivedAt(b.receivedAt) ?? 0),
    );
    for (const message of chronological) {
      const serverStep = detectServerCommandStep(message.topic, message.payload);
      if (serverStep === "dnf") {
        done.add("request");
      }

      if (!isFiscalCmdServerTopic(message.topic)) continue;
      const step = detectPrinterResponseStep(message.payload);
      if (!step) continue;
      if (step === "request") {
        done.add("request");
        continue;
      }
      if (step === "wfile_spiff") {
        const resolved = resolveWfileResponseStep(wfileResponseIndex);
        if (resolved) done.add(resolved);
        wfileResponseIndex++;
        continue;
      }
      done.add(step);
    }
    for (const stepId of panelAcknowledgedSteps) {
      done.add(stepId);
    }
    return done;
  }, [panelAcknowledgedSteps, ritualAnchorAt, ritualMessages, topics]);

  const activeStepIndex = useMemo(() => {
    const index = ritualSteps.findIndex(
      (step) => stepStatuses[step.id] !== "success",
    );
    return index === -1 ? ritualSteps.length : index;
  }, [ritualSteps, stepStatuses]);

  const latestFiscalMessages = useMemo(() => {
    if (!topics) return [];
    const source = ritualMessages.length > 0 ? ritualMessages : liveMessages;
    return source
      .filter((message) => fiscalTopicMatchesMac(message.topic, topics.mac))
      .slice(0, 3);
  }, [liveMessages, ritualMessages, topics]);

  useEffect(() => {
    if (!activePrinter?.fiscalSerial?.trim() || !activePrinter.macAddress?.trim()) {
      setPrecheck(null);
      return;
    }
    let cancelled = false;
    setPrecheckLoading(true);
    void precheckEnajenacionMqtt(
      activePrinter.fiscalSerial,
      activePrinter.macAddress,
    )
      .then((result) => {
        if (!cancelled) setPrecheck(result);
      })
      .catch(() => {
        if (!cancelled) setPrecheck(null);
      })
      .finally(() => {
        if (!cancelled) setPrecheckLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activePrinter?.fiscalSerial, activePrinter?.macAddress]);

  useEffect(() => {
    const clientId = activePrinter?.clientId;
    const fiscalSerial = activePrinter?.fiscalSerial?.trim();
    if (!clientId || !fiscalSerial) {
      setCommandContext(null);
      setCommandContextError(null);
      return;
    }
    let cancelled = false;
    setCommandContextLoading(true);
    setCommandContextError(null);
    void (async () => {
      try {
        const client = await fetchClientById(clientId);
        const branch = await fetchBranchById(client.branchId);
        const company = await fetchCompanyById(branch.companyId);
        if (cancelled) return;
        setCommandContext(
          buildEnajenacionCommandContextFromClientData({
            fiscalSerial,
            rif: company.rif,
            businessName: company.businessName,
            contributorType: company.contributorType,
            address: branch.address,
            city: branch.city,
            state: branch.state,
          }),
        );
      } catch (err) {
        if (!cancelled) {
          setCommandContext(null);
          setCommandContextError(getMqttErrorMessage(err));
        }
      } finally {
        if (!cancelled) setCommandContextLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePrinter?.clientId, activePrinter?.fiscalSerial]);

  useEffect(() => {
    if (ritualAnchorAt === null) {
      setStepStatuses({});
      return;
    }
    const next: Record<string, StepStatus> = {};
    for (const step of ritualSteps) {
      next[step.id] = completedRitualSteps.has(step.id) ? "success" : "pending";
    }
    setStepStatuses(next);
  }, [completedRitualSteps, ritualAnchorAt, ritualSteps]);

  const refreshPrinterStatus = useCallback(async (printerId: number) => {
    const updated = await fetchPrinterById(printerId);
    setPrinterStatus(updated);
    return updated;
  }, []);

  useEffect(() => {
    if (
      stepStatuses["report-z"] === "success" &&
      activePrinter &&
      printerStatus?.status !== "enajenada"
    ) {
      void refreshPrinterStatus(activePrinter.id).catch(() => undefined);
    }
  }, [
    stepStatuses,
    activePrinter,
    printerStatus?.status,
    refreshPrinterStatus,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchPrinters();
        if (!cancelled) {
          setPrinters(list);
          const first = list.find(isPrinterEligibleForEnajenacionTest);
          if (first) setSelectedId(first.id);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(getMqttErrorMessage(err));
        }
      } finally {
        if (!cancelled) setPrintersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (!activePrinter) {
      setPrinterStatus(null);
      return;
    }
    let cancelled = false;
    void refreshPrinterStatus(activePrinter.id)
      .then((updated) => {
        if (!cancelled) setPrinterStatus(updated);
      })
      .catch(() => {
        if (!cancelled) setPrinterStatus(activePrinter);
      });
    return () => {
      cancelled = true;
    };
  }, [activePrinter, refreshPrinterStatus]);

  function handlePrinterChange(value: string) {
    setSelectedId(value ? Number(value) : "");
    setStepStatuses({});
    setPrinterStatus(null);
    setManualTrackingAnchorAt(null);
    setCommandContext(null);
    setCommandContextError(null);
    setPanelAcknowledgedSteps(new Set());
  }

  function handleStepPublished(stepId: string) {
    setPanelAcknowledgedSteps((prev) => new Set([...prev, stepId]));
  }

  function handleResetTracking() {
    setManualTrackingAnchorAt(Date.now());
    setStepStatuses({});
    setPanelAcknowledgedSteps(new Set());
    toast.success(
      "Seguimiento reiniciado. Solo contarán mensajes posteriores a este momento o al próximo ptrEnajenar.",
    );
  }

  async function handleApplyMonitorTopic() {
    if (!topics) return;
    try {
      if (onApplyMonitorTopic) {
        await onApplyMonitorTopic(topics.monitor);
      } else {
        await updateMqttSubscription(topics.monitor);
      }
      toast.success(`Monitor apuntando a ${topics.monitor}`);
      onOpenMonitor?.();
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
          <Printer className="size-5 text-accent" />
          Prueba de enajenación MQTT
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Elige una impresora registrada en AEG Core y recorre el ritual paso a
          paso. Los comandos en Comando son tráfico real de AEG Core; las
          respuestas de impresora en CmdServer se simulan con un clic desde este
          panel.
        </p>

        <div className="mt-4 rounded-lg border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-card-foreground">
          <p>
            <strong className="font-medium">Comando</strong> (servidor →
            impresora): solo lectura desde el monitor.{" "}
            <strong className="font-medium">CmdServer</strong> (impresora →
            servidor): publícalo con <em>Iniciar ritual</em> o{" "}
            <em>Simular respuesta OK</em>. Conecta el WebSocket en la pestaña
            Monitor para ver el tráfico en tiempo real.
          </p>
        </div>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-medium">
            Impresora registrada
          </span>
          <select
            value={selectedId}
            onChange={(e) => handlePrinterChange(e.target.value)}
            disabled={printersLoading}
            className={inputClass}
          >
            {eligiblePrinters.length === 0 ? (
              <option value="">No hay impresoras aptas</option>
            ) : (
              eligiblePrinters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fiscalSerial} · {p.macAddress} · cliente #{p.clientId}
                </option>
              ))
            )}
          </select>
          <p className="mt-1.5 text-xs text-muted">
            Debe estar asignada o en laboratorio, con cliente, serial fiscal y
            MAC.
          </p>
        </label>

        {topics && activePrinter && (
          <div className="mt-4 rounded-lg border border-border bg-foreground/[0.02] p-4 text-sm">
            {precheckLoading ? (
              <p className="text-muted">Validando requisitos de enajenación…</p>
            ) : precheck && !precheck.ready ? (
              <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-rose-950 dark:text-rose-100">
                <p className="font-medium">AEG Core rechazará ptrEnajenar</p>
                <p className="mt-1 text-sm">{precheck.message}</p>
              </div>
            ) : precheck?.ready ? (
              <p className="mb-4 text-emerald-700 dark:text-emerald-300">
                Requisitos de BD verificados: AEG Core puede iniciar el ritual.
              </p>
            ) : null}
            {ritualAnchorAt !== null ? (
              <p className="mb-4 text-xs text-muted">
                Sesión de seguimiento anclada a{" "}
                <time dateTime={new Date(ritualAnchorAt).toISOString()}>
                  {formatAnchorTime(ritualAnchorAt)}
                </time>
                . Los pasos solo avanzan con mensajes posteriores a ese
                ptrEnajenar.
              </p>
            ) : (
              <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
                No hay <code className="font-mono text-xs">ptrEnajenar</code> en
                el buffer del monitor. Pulsa{" "}
                <strong className="font-medium">Iniciar ritual</strong> en el
                paso 1 o <strong className="font-medium">Reiniciar seguimiento</strong>{" "}
                justo después de enviarlo.
              </p>
            )}
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted">Serial fiscal</dt>
                <dd className="font-mono text-xs break-all">
                  {activePrinter.fiscalSerial}
                </dd>
              </div>
              <div>
                <dt className="text-muted">MAC</dt>
                <dd className="font-mono text-xs break-all">
                  {activePrinter.macAddress}
                </dd>
              </div>
              <div>
                <dt className="text-muted">CmdServer</dt>
                <dd className="font-mono text-xs break-all">{topics.cmdServer}</dd>
              </div>
              <div>
                <dt className="text-muted">Comando</dt>
                <dd className="font-mono text-xs break-all">{topics.comando}</dd>
              </div>
              <div>
                <dt className="text-muted">Estado en BD</dt>
                <dd>
                  {printerStatus
                    ? printerStatusLabel(printerStatus.status)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Monitor</dt>
                <dd className="font-mono text-xs break-all">{topics.monitor}</dd>
              </div>
            </dl>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {onApplyMonitorTopic && topics && (
            <button
              type="button"
              onClick={handleApplyMonitorTopic}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5"
            >
              <Zap className="size-4" />
              Usar monitor fiscal
            </button>
          )}
          {activePrinter && (
            <button
              type="button"
              onClick={handleResetTracking}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5"
            >
              <RotateCcw className="size-4" />
              Reiniciar seguimiento
            </button>
          )}
          {activePrinter && (
            <button
              type="button"
              onClick={() => void refreshPrinterStatus(activePrinter.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5"
            >
              <RefreshCw className="size-4" />
              Actualizar estado
            </button>
          )}
        </div>
      </section>

      {ritualSteps.length > 0 && (
        <section className="space-y-3">
          {ritualSteps.map((step, index) => {
            const status = stepStatuses[step.id] ?? "pending";
            const locked = index > activeStepIndex;
            const serverCommand =
              topics && !step.isRequest
                ? findLatestServerCommand(ritualMessages, topics.mac, step.id)
                : null;
            const simulation =
              topics && commandContext && activePrinter?.macAddress
                ? buildPrinterSimulationPayload(
                    step.id,
                    commandContext,
                    activePrinter.macAddress,
                    topics.cmdServer,
                  )
                : null;
            const isActiveStep = index === activeStepIndex;
            const priorStepsComplete = ritualSteps
              .slice(0, index)
              .every((s) => (stepStatuses[s.id] ?? "pending") === "success");
            const canSimulatePrinterResponse =
              step.isRequest ||
              Boolean(serverCommand) ||
              (isActiveStep && priorStepsComplete);
            const simulateDisabled =
              locked ||
              !simulation ||
              commandContextLoading ||
              Boolean(precheck && !precheck.ready) ||
              (status === "pending" && !canSimulatePrinterResponse);
            const simulateDisabledReason = locked
              ? "Completa el paso anterior primero."
              : commandContextLoading
                ? "Cargando datos fiscales del cliente…"
                : commandContextError
                  ? commandContextError
                  : precheck && !precheck.ready
                    ? precheck.message ?? "AEG Core rechazará ptrEnajenar."
                    : status === "pending" && !canSimulatePrinterResponse
                      ? "Espera el comando real de AEG Core en Comando."
                      : undefined;

            return (
              <article
                key={step.id}
                className={cn(
                  "rounded-xl border border-border bg-card p-4 shadow-sm",
                  locked && "opacity-60",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-card-foreground">
                    {step.label}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      status === "success" &&
                        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                      status === "pending" && "bg-foreground/5 text-muted",
                    )}
                  >
                    {stepStatusLabel(
                      status,
                      step.id,
                      Boolean(serverCommand),
                    )}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{step.description}</p>
                <p className="mt-1 font-mono text-xs text-muted break-all">
                  {step.topic}
                </p>

                {!locked && !step.isRequest && (
                  <ServerCommandBlock serverCommand={serverCommand} />
                )}

                {!locked && status === "pending" && simulation && (
                  <SimulatePrinterButton
                    stepId={step.id}
                    simulation={simulation}
                    disabled={simulateDisabled}
                    disabledReason={simulateDisabledReason}
                    onPublished={handleStepPublished}
                  />
                )}

                <p className="mt-3 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-sm text-muted">
                  {locked
                    ? "Completa el paso anterior antes de continuar."
                    : step.isRequest
                      ? status === "success"
                        ? "ptrEnajenar enviado. El DNF real aparecerá en el paso 2 (Comando)."
                        : "Pulsa Iniciar ritual para publicar ptrEnajenar en CmdServer."
                      : status === "success"
                        ? "Respuesta simulada recibida por AEG Core."
                        : serverCommand
                          ? "Revisa el comando real y pulsa Simular respuesta OK."
                          : "Esperando que AEG Core publique en Comando."}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Éxito esperado: {step.successHint}
                </p>
              </article>
            );
          })}
        </section>
      )}

      {topics && (
        <section className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium text-card-foreground">
                Últimos mensajes del monitor
              </h3>
              <p className="text-muted">
                Confirma cuándo AEG Core publicó el comando que la impresora debe
                ejecutar.
              </p>
            </div>
            {onOpenMonitor && (
              <button
                type="button"
                onClick={onOpenMonitor}
                className="text-left text-sm font-medium text-accent hover:underline sm:text-right"
              >
                Abrir monitor
              </button>
            )}
          </div>

          {latestFiscalMessages.length === 0 ? (
            <p className="mt-3 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-muted">
              Sin mensajes para esta MAC en el buffer actual.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {latestFiscalMessages.map((message) => (
                <li
                  key={`${message.receivedAt}-${message.topic}-${message.payload}`}
                  className="rounded-lg border border-border bg-foreground/[0.02] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <code className="font-mono text-xs break-all">
                      {message.topic}
                    </code>
                    <span className="text-xs text-muted">
                      {new Date(message.receivedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap font-mono text-xs text-card-foreground">
                    {message.payload}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {ritualSteps.length === 0 && !printersLoading && (
        <section className="rounded-xl border border-border bg-card p-5 text-sm text-muted shadow-sm">
          No hay impresoras aptas. Deben tener estatus Asignada o Laboratorio,
          cliente, serial fiscal y MAC.
        </section>
      )}

      {printersLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" />
          Cargando impresoras…
        </div>
      )}
    </div>
  );
}
