"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Printer, RefreshCw, Zap } from "lucide-react";
import { useToast } from "@/context/toast-provider";
import { fetchPrinterById, fetchPrinters } from "@/lib/printers-api";
import {
  getMqttErrorMessage,
  precheckEnajenacionMqtt,
  updateMqttSubscription,
} from "@/lib/mqtt-api";
import {
  ENAJENACION_FLOW_STEPS,
  compactMac,
  detectPrinterResponseStep,
  detectServerCommandStep,
  fiscalCmdServerTopic,
  fiscalComandoTopic,
  fiscalMonitorTopic,
  fiscalTopicMatchesMac,
  isFiscalCmdServerTopic,
  isPrinterEligibleForEnajenacionTest,
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

function JsonBlock({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-card-foreground">{title}</h4>
      <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-foreground/[0.03] p-4 font-mono text-xs text-card-foreground">
        {children}
      </pre>
    </div>
  );
}

function stepStatusLabel(
  status: StepStatus,
  stepId: string,
  hasServerCommand: boolean,
): string {
  if (status === "success") {
    return stepId === "request" ? "Solicitud recibida" : "Impresora respondió";
  }
  if (stepId === "request") {
    return "Esperando impresora";
  }
  return hasServerCommand ? "Esperando impresora" : "Esperando AEG Core";
}

function findLatestServerCommand(
  messages: MqttInboundMessage[],
  mac: string,
  stepId: string,
): MqttInboundMessage | null {
  for (const message of messages) {
    if (!fiscalTopicMatchesMac(message.topic, mac)) continue;
    if (detectServerCommandStep(message.topic, message.payload) === stepId) {
      return message;
    }
  }
  return null;
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
  const panelPublishedKeysRef = useRef<Set<string>>(new Set());
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

  const completedRitualSteps = useMemo(() => {
    if (!topics) return new Set<string>();
    const done = new Set<string>();
    let wfileResponseIndex = 0;
    for (const message of [...liveMessages].reverse()) {
      if (!fiscalTopicMatchesMac(message.topic, topics.mac)) continue;

      const serverStep = detectServerCommandStep(message.topic, message.payload);
      if (serverStep === "dnf") {
        done.add("request");
      }

      if (!isFiscalCmdServerTopic(message.topic)) continue;
      const dedupeKey = `${message.topic}:${message.payload}`;
      if (panelPublishedKeysRef.current.has(dedupeKey)) continue;
      const step = detectPrinterResponseStep(message.payload);
      if (!step) continue;
      if (step === "wfile_spiff") {
        const resolved = resolveWfileResponseStep(wfileResponseIndex);
        if (resolved) done.add(resolved);
        wfileResponseIndex++;
        continue;
      }
      done.add(step);
    }
    return done;
  }, [liveMessages, topics]);

  const activeStepIndex = useMemo(() => {
    const index = ritualSteps.findIndex(
      (step) => stepStatuses[step.id] !== "success",
    );
    return index === -1 ? ritualSteps.length : index;
  }, [ritualSteps, stepStatuses]);

  const latestFiscalMessages = useMemo(() => {
    if (!topics) return [];
    return liveMessages
      .filter((message) => fiscalTopicMatchesMac(message.topic, topics.mac))
      .slice(0, 3);
  }, [liveMessages, topics]);

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
    if (completedRitualSteps.size === 0) return;
    setStepStatuses((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const stepId of completedRitualSteps) {
        if (next[stepId] === "success") continue;
        next[stepId] = "success";
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [completedRitualSteps]);

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
          Enajenación con impresora física
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Elige una impresora registrada en AEG Core. Enciéndela y observa el
          ritual en el monitor: ptrEnajenar en CmdServer, comandos del servidor
          en Comando y respuestas de la impresora en CmdServer.
        </p>

        <div className="mt-4 rounded-lg border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-card-foreground">
          <p>
            El panel <strong className="font-medium">no publica</strong> en el
            broker. Marca cada paso según el tráfico que AEG Core recibe en el
            monitor. Usa <strong className="font-medium">Usar monitor fiscal</strong>{" "}
            y conecta el WebSocket en la pestaña Monitor para ver Comando y
            CmdServer en tiempo real.
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
                ? findLatestServerCommand(liveMessages, topics.mac, step.id)
                : null;

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

                {!step.isRequest && serverCommand && (
                  <div className="mt-4">
                    <JsonBlock title="Comando del servidor (Comando)">
                      {serverCommand.payload}
                    </JsonBlock>
                  </div>
                )}

                <p className="mt-3 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-sm text-muted">
                  {locked
                    ? "Completa el paso anterior antes de esperar este mensaje."
                    : step.isRequest
                      ? status === "success"
                        ? "ptrEnajenar recibido. AEG Core debe publicar el DNF en Comando."
                        : "Enciende la impresora y espera ptrEnajenar en CmdServer."
                      : status === "success"
                        ? "La impresora respondió en CmdServer."
                        : serverCommand
                          ? "Ejecuta el comando en la impresora y espera su respuesta en CmdServer."
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
