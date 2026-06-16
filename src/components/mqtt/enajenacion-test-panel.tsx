"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Play,
  Printer,
  Square,
  Zap,
} from "lucide-react";
import { useToast } from "@/context/toast-provider";
import { ENAJENACION_MQTT_DOCS_PATH } from "@/lib/mqtt-docs-paths";
import { fetchPrinterById, fetchPrinters } from "@/lib/printers-api";
import {
  getMqttErrorMessage,
  publishMqttMessage,
  updateMqttSubscription,
} from "@/lib/mqtt-api";
import {
  EnajenacionResponseSteps,
  buildPtrEnajenarPayload,
  buildSimulatorResponseForKind,
  classifyFiscalCommand,
  compactMac,
  fiscalCmdServerTopic,
  fiscalComandoTopic,
  fiscalMonitorTopic,
  flowStepById,
  isPrinterEligibleForEnajenacionTest,
} from "@/lib/enajenacion-mqtt-protocol";
import { EnajenacionStepsGuide } from "@/components/mqtt/enajenacion-steps-guide";
import { printerStatusLabel } from "@/lib/printer-status";
import type { PrinterResponse } from "@/types/printer";
import type { MqttInboundMessage } from "@/types/mqtt";
import { cn } from "@/lib/utils";

type LogTone = "info" | "success" | "error";

type LogEntry = {
  id: string;
  at: string;
  message: string;
  tone: LogTone;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

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
  const [autoSequential, setAutoSequential] = useState(true);
  const [autoRespondLive, setAutoRespondLive] = useState(false);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const abortRef = useRef(false);
  const respondedRef = useRef<Set<string>>(new Set());

  const eligiblePrinters = useMemo(
    () => printers.filter(isPrinterEligibleForEnajenacionTest),
    [printers],
  );

  const selectedPrinter = useMemo(
    () => eligiblePrinters.find((p) => p.id === selectedId) ?? null,
    [eligiblePrinters, selectedId],
  );

  const topics = useMemo(() => {
    if (!selectedPrinter?.macAddress) return null;
    const mac = compactMac(selectedPrinter.macAddress);
    return {
      mac,
      cmdServer: fiscalCmdServerTopic(mac),
      comando: fiscalComandoTopic(mac),
      monitor: fiscalMonitorTopic(mac),
    };
  }, [selectedPrinter]);

  const appendLog = useCallback((message: string, tone: LogTone = "info") => {
    setLogs((prev) => [
      {
        id: `${Date.now()}-${prev.length}`,
        at: new Date().toISOString(),
        message,
        tone,
      },
      ...prev,
    ]);
  }, []);

  const refreshPrinterStatus = useCallback(async (printerId: number) => {
    const updated = await fetchPrinterById(printerId);
    setPrinterStatus(updated);
    return updated;
  }, []);

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
    if (!selectedPrinter) {
      setPrinterStatus(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const updated = await refreshPrinterStatus(selectedPrinter.id);
        if (!cancelled) setPrinterStatus(updated);
      } catch {
        if (!cancelled) setPrinterStatus(selectedPrinter);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPrinter, refreshPrinterStatus]);

  useEffect(() => {
    if (!autoRespondLive || !running || !topics) return;

    for (const message of liveMessages) {
      if (!message.topic.endsWith("/AEG_Fiscal/Integracion/Comando")) continue;
      if (!message.topic.startsWith(topics.mac)) continue;

      const dedupeKey = `${message.receivedAt}:${message.payload.slice(0, 80)}`;
      if (respondedRef.current.has(dedupeKey)) continue;

      try {
        const kind = classifyFiscalCommand(message.payload);
        const response = buildSimulatorResponseForKind(
          kind,
          selectedPrinter?.fiscalSerial,
        );
        respondedRef.current.add(dedupeKey);
        void publishMqttMessage({
          topic: topics.cmdServer,
          payload: response as Record<string, unknown> | unknown[],
        }).then(() => {
          appendLog(`Auto-respuesta (${kind}) publicada en CmdServer`, "success");
        });
      } catch (err) {
        appendLog(
          err instanceof Error ? err.message : "No se pudo auto-responder",
          "error",
        );
      }
    }
  }, [appendLog, autoRespondLive, liveMessages, running, topics]);

  async function publishToCmdServer(payload: unknown, label: string) {
    if (!topics) return;
    await publishMqttMessage({
      topic: topics.cmdServer,
      payload: payload as Record<string, unknown> | unknown[],
    });
    appendLog(label, "success");
  }

  async function handleApplyMonitorTopic() {
    if (!topics || !onApplyMonitorTopic) return;
    try {
      await onApplyMonitorTopic(topics.monitor);
      toast.success(`Monitor apuntando a ${topics.monitor}`);
      onOpenMonitor?.();
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    }
  }

  async function runSequentialResponses(fiscalSerial: string) {
    const ctx = { fiscalSerial };
    for (const step of EnajenacionResponseSteps) {
      if (abortRef.current) return;
      await sleep(step.delayMs);
      if (abortRef.current) return;
      await publishToCmdServer(step.buildPayload(ctx), step.label);
    }
  }

  async function pollUntilEnajenada(printerId: number) {
    for (let attempt = 0; attempt < 15; attempt++) {
      if (abortRef.current) return;
      await sleep(1000);
      const updated = await refreshPrinterStatus(printerId);
      if (updated.status === "enajenada") {
        appendLog("Impresora marcada como ENAJENADA en el servidor.", "success");
        toast.success("Enajenación completada.");
        return;
      }
    }
    appendLog(
      "Tiempo de espera agotado: revisa logs del servidor o el monitor MQTT.",
      "error",
    );
  }

  async function handleStart() {
    if (!selectedPrinter || !topics) return;
    abortRef.current = false;
    respondedRef.current.clear();
    setRunning(true);
    setLogs([]);

    try {
      appendLog(
        `Inicio de prueba · ${selectedPrinter.fiscalSerial} · ${topics.mac}`,
      );

      if (onApplyMonitorTopic) {
        try {
          await onApplyMonitorTopic(topics.monitor);
          appendLog(`Monitor suscrito a ${topics.monitor}`);
          onOpenMonitor?.();
        } catch (err) {
          appendLog(getMqttErrorMessage(err), "error");
        }
      } else {
        try {
          await updateMqttSubscription(topics.monitor);
          appendLog(`Suscripción del servidor actualizada a ${topics.monitor}`);
        } catch (err) {
          appendLog(getMqttErrorMessage(err), "error");
        }
      }

      await publishToCmdServer(
        buildPtrEnajenarPayload(
          selectedPrinter.fiscalSerial,
          selectedPrinter.macAddress!,
        ),
        "Paso 1 — ptrEnajenar publicado",
      );

      if (autoSequential) {
        await runSequentialResponses(selectedPrinter.fiscalSerial);
      } else {
        appendLog(
          "Modo manual: usa los botones de respuesta o activa secuencia automática.",
        );
        return;
      }

      await pollUntilEnajenada(selectedPrinter.id);
    } catch (err) {
      appendLog(getMqttErrorMessage(err), "error");
      toast.error(getMqttErrorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  function handleStop() {
    abortRef.current = true;
    setRunning(false);
    appendLog("Simulación detenida por el usuario.", "error");
  }

  async function handleManualStep(stepId: string) {
    if (!topics || !selectedPrinter?.fiscalSerial) return;
    const step = EnajenacionResponseSteps.find((s) => s.id === stepId);
    if (!step) return;
    try {
      await publishToCmdServer(
        step.buildPayload({ fiscalSerial: selectedPrinter.fiscalSerial }),
        step.label,
      );
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <Printer className="size-5 text-accent" />
              Simulador de enajenación MQTT
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Prueba el ritual fiscal completo sin hardware: el panel hace de{" "}
              <strong className="font-medium text-card-foreground">
                impresora simulada
              </strong>{" "}
              (publica en CmdServer) y AEG Core responde como en producción.
              Consulta la guía de pasos más abajo para entender cada fase y sus
              criterios de éxito.
            </p>
          </div>
          <Link
            href={ENAJENACION_MQTT_DOCS_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            Referencia técnica completa
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        </div>

        <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          <p className="font-medium">Requisitos de la impresora elegida</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900/90 dark:text-amber-50/90">
            <li>Estatus Asignada o Laboratorio, con cliente y MAC registrados.</li>
            <li>Serial fiscal y MAC coherentes con los tópicos MQTT.</li>
            <li>Cliente con RIF, razón social y dirección completos en BD.</li>
            <li>Sin otra sesión MQTT activa para la misma MAC.</li>
          </ul>
        </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="block lg:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">
            Impresora (asignada / laboratorio)
          </span>
          <select
            value={selectedId}
            onChange={(e) =>
              setSelectedId(e.target.value ? Number(e.target.value) : "")
            }
            disabled={printersLoading || running}
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
        </label>

        {topics && selectedPrinter && (
          <div className="lg:col-span-2 rounded-lg border border-border bg-foreground/[0.02] p-4 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted">CmdServer (impresora → servidor)</dt>
                <dd className="font-mono text-xs break-all">{topics.cmdServer}</dd>
              </div>
              <div>
                <dt className="text-muted">Comando (servidor → impresora)</dt>
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
                <dt className="text-muted">Monitor sugerido</dt>
                <dd className="font-mono text-xs break-all">{topics.monitor}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <label className="flex gap-3 rounded-lg border border-border p-3 hover:bg-foreground/[0.02]">
          <input
            type="checkbox"
            className="mt-1"
            checked={autoSequential}
            onChange={(e) => setAutoSequential(e.target.checked)}
            disabled={running}
          />
          <span>
            <span className="font-medium text-card-foreground">
              Secuencia automática (pasos 2a–7)
            </span>
            <span className="mt-0.5 block text-muted">
              Tras publicar ptrEnajenar, envía todas las respuestas simuladas del
              firmware en orden, con la pausa configurada entre pasos.
            </span>
          </span>
        </label>
        <label className="flex gap-3 rounded-lg border border-border p-3 hover:bg-foreground/[0.02]">
          <input
            type="checkbox"
            className="mt-1"
            checked={autoRespondLive}
            onChange={(e) => setAutoRespondLive(e.target.checked)}
            disabled={running}
          />
          <span>
            <span className="font-medium text-card-foreground">
              Auto-responder comandos del monitor
            </span>
            <span className="mt-0.5 block text-muted">
              Cuando AEG Core publica en Comando, detecta el tipo de comando y
              publica la respuesta de éxito correspondiente en CmdServer (útil
              si desactivas la secuencia automática).
            </span>
          </span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleStart}
          disabled={running || !selectedPrinter || printersLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {running ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          Iniciar simulación
        </button>
        {running && (
          <button
            type="button"
            onClick={handleStop}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5"
          >
            <Square className="size-4" />
            Detener
          </button>
        )}
        {onApplyMonitorTopic && topics && (
          <button
            type="button"
            onClick={handleApplyMonitorTopic}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5 disabled:opacity-60"
          >
            <Zap className="size-4" />
            Usar tópico fiscal en monitor
          </button>
        )}
        {selectedPrinter && (
          <button
            type="button"
            onClick={() => void refreshPrinterStatus(selectedPrinter.id)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5"
          >
            <CheckCircle2 className="size-4" />
            Actualizar estado
          </button>
        )}
      </div>

      {!autoSequential && topics && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-muted">
            Modo manual: envía cada respuesta simulada cuando corresponda (tras
            ver el comando en el monitor).
          </p>
          <div className="flex flex-wrap gap-2">
            {EnajenacionResponseSteps.map((step) => {
              const flow = flowStepById(step.flowStepId);
              return (
                <button
                  key={step.id}
                  type="button"
                  title={flow?.purpose}
                  onClick={() => void handleManualStep(step.id)}
                  className="rounded-lg border border-border px-3 py-2 text-left text-xs hover:bg-foreground/5"
                >
                  <span className="block font-medium text-card-foreground">
                    {flow?.step ?? step.label} — {flow?.name ?? step.label}
                  </span>
                  {flow?.successCriteria[0] ? (
                    <span className="mt-0.5 block text-muted">
                      Éxito: {flow.successCriteria[0]}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium">Registro de la prueba</h3>
          <ul className="max-h-56 space-y-2 overflow-auto rounded-lg border border-border p-3 text-sm">
            {logs.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  "font-mono text-xs",
                  entry.tone === "success" && "text-emerald-700 dark:text-emerald-300",
                  entry.tone === "error" && "text-rose-700 dark:text-rose-300",
                  entry.tone === "info" && "text-card-foreground",
                )}
              >
                [{new Date(entry.at).toLocaleTimeString()}] {entry.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <EnajenacionStepsGuide />
      </section>
    </div>
  );
}
