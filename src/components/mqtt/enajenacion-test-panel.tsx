"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Play,
  Printer,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useToast } from "@/context/toast-provider";
import { fetchPrinterById, fetchPrinters } from "@/lib/printers-api";
import {
  getMqttErrorMessage,
  publishMqttMessage,
  updateMqttSubscription,
} from "@/lib/mqtt-api";
import {
  ENAJENACION_FLOW_STEPS,
  EnajenacionResponseSteps,
  buildPtrEnajenarPayload,
  compactMac,
  fiscalCmdServerTopic,
  fiscalComandoTopic,
  fiscalMonitorTopic,
  flowStepById,
  isPrinterEligibleForEnajenacionTest,
} from "@/lib/enajenacion-mqtt-protocol";
import { printerStatusLabel } from "@/lib/printer-status";
import { formatJsonText } from "@/lib/format-json-paste";
import type { PrinterResponse } from "@/types/printer";
import type {
  MqttInboundMessage,
  MqttPublishPayload,
  MqttPublishResponse,
} from "@/types/mqtt";
import { cn } from "@/lib/utils";

type CommandStatus = "pending" | "running" | "success" | "error";

type ManualCommand = {
  id: string;
  label: string;
  description: string;
  topic: string;
  payload: MqttPublishPayload;
  successHint: string;
};

type CommandState = {
  payloadText: string;
  status: CommandStatus;
  result: { response: MqttPublishResponse; httpStatus: number } | null;
  error: string | null;
};

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

function JsonBlock({
  title,
  status,
  children,
}: {
  title: string;
  status?: "ok" | "error" | "neutral";
  children: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-card-foreground">{title}</h3>
        {status && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              status === "ok" &&
                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              status === "error" &&
                "bg-rose-500/10 text-rose-700 dark:text-rose-300",
              status === "neutral" && "bg-foreground/5 text-muted",
            )}
          >
            {status === "ok"
              ? "Éxito"
              : status === "error"
                ? "Error"
                : "Respuesta"}
          </span>
        )}
      </div>
      <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-foreground/[0.03] p-4 font-mono text-xs text-card-foreground">
        {children}
      </pre>
    </div>
  );
}

function stringifyPayload(payload: MqttPublishPayload): string {
  return JSON.stringify(payload, null, 2);
}

function parsePayloadText(text: string):
  | { ok: true; payload: MqttPublishPayload }
  | { ok: false; error: string } {
  try {
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return {
          ok: false,
          error: "El array JSON debe tener al menos un elemento.",
        };
      }
      return { ok: true, payload: parsed };
    }
    if (parsed !== null && typeof parsed === "object") {
      const payload = parsed as Record<string, unknown>;
      if (Object.keys(payload).length === 0) {
        return {
          ok: false,
          error: "El objeto JSON debe tener al menos un campo.",
        };
      }
      return { ok: true, payload };
    }
    return {
      ok: false,
      error: "El comando debe ser un objeto JSON o un array JSON.",
    };
  } catch {
    return { ok: false, error: "El comando no es JSON válido." };
  }
}

function statusLabel(status: CommandStatus): string {
  switch (status) {
    case "running":
      return "Ejecutando";
    case "success":
      return "Listo";
    case "error":
      return "Error";
    default:
      return "Pendiente";
  }
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
  const [commandStates, setCommandStates] = useState<Record<string, CommandState>>(
    {},
  );

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

  const manualCommands = useMemo<ManualCommand[]>(() => {
    if (!selectedPrinter?.fiscalSerial || !selectedPrinter.macAddress || !topics) {
      return [];
    }

    const requestStep = ENAJENACION_FLOW_STEPS.find((step) => step.id === "request");
    return [
      {
        id: "request",
        label: "1. Solicitar enajenación",
        description:
          requestStep?.purpose ??
          "Publica ptrEnajenar para que AEG Core inicie el ritual fiscal.",
        topic: topics.cmdServer,
        payload: buildPtrEnajenarPayload(
          selectedPrinter.fiscalSerial,
          selectedPrinter.macAddress,
        ),
        successHint:
          requestStep?.successCriteria[2] ??
          "AEG Core debe publicar el siguiente comando en el tópico Comando.",
      },
      ...EnajenacionResponseSteps.map((step) => {
        const flow = flowStepById(step.flowStepId);
        return {
          id: step.id,
          label: flow ? `${flow.step}. ${flow.name}` : step.label,
          description:
            flow?.panelSimulates ??
            "Publica la respuesta simulada del firmware en CmdServer.",
          topic: topics.cmdServer,
          payload: step.buildPayload({
            fiscalSerial: selectedPrinter.fiscalSerial,
          }) as MqttPublishPayload,
          successHint:
            flow?.successCriteria[0] ??
            "AEG Core debe aceptar la respuesta y continuar con el siguiente paso.",
        };
      }),
    ];
  }, [selectedPrinter, topics]);

  const activeStepIndex = useMemo(() => {
    const index = manualCommands.findIndex(
      (command) => commandStates[command.id]?.status !== "success",
    );
    return index === -1 ? manualCommands.length : index;
  }, [commandStates, manualCommands]);

  const latestFiscalMessages = useMemo(() => {
    if (!topics) return [];
    return liveMessages
      .filter((message) => message.topic.startsWith(topics.mac))
      .slice(0, 3);
  }, [liveMessages, topics]);

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

  function handlePrinterChange(value: string) {
    setSelectedId(value ? Number(value) : "");
    setCommandStates({});
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

  function handlePayloadChange(index: number, commandId: string, value: string) {
    setCommandStates((prev) => {
      const next = { ...prev };
      for (let i = index; i < manualCommands.length; i++) {
        const command = manualCommands[i];
        const current = next[command.id] ?? {
          payloadText: stringifyPayload(command.payload),
          status: "pending" as CommandStatus,
          result: null,
          error: null,
        };
        next[command.id] = {
          ...current,
          payloadText: command.id === commandId ? value : current.payloadText,
          status: "pending",
          result: null,
          error: null,
        };
      }
      return next;
    });
  }

  function handlePayloadPaste(
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    index: number,
    commandId: string,
  ) {
    const formatted = formatJsonText(e.clipboardData.getData("text/plain"));
    if (formatted == null) return;

    e.preventDefault();
    const { selectionStart, selectionEnd, value } = e.currentTarget;
    const next =
      value.slice(0, selectionStart) + formatted + value.slice(selectionEnd);
    handlePayloadChange(index, commandId, next);
  }

  async function handleExecute(index: number, command: ManualCommand) {
    if (index > activeStepIndex) return;
    const current = commandStates[command.id];
    const parsed = parsePayloadText(
      current?.payloadText ?? stringifyPayload(command.payload),
    );
    if (!parsed.ok) {
      setCommandStates((prev) => ({
        ...prev,
        [command.id]: {
          ...(prev[command.id] ?? {
            payloadText: stringifyPayload(command.payload),
            result: null,
          }),
          status: "error",
          error: parsed.error,
          result: null,
        },
      }));
      return;
    }
    const payload = parsed.payload;

    setCommandStates((prev) => {
      const next = { ...prev };
      for (let i = index; i < manualCommands.length; i++) {
        const item = manualCommands[i];
        const state = next[item.id] ?? {
          payloadText: stringifyPayload(item.payload),
          status: "pending" as CommandStatus,
          result: null,
          error: null,
        };
        next[item.id] = {
          ...state,
          status: i === index ? "running" : "pending",
          result: null,
          error: null,
        };
      }
      return next;
    });

    try {
      const result = await publishMqttMessage({
        topic: command.topic,
        payload,
      });
      setCommandStates((prev) => ({
        ...prev,
        [command.id]: {
          ...(prev[command.id] ?? {
            payloadText: stringifyPayload(command.payload),
            error: null,
          }),
          status: "success",
          result,
          error: null,
        },
      }));
      toast.success(`${command.label} publicado.`);

      if (command.id === "report-z" && selectedPrinter) {
        void refreshPrinterStatus(selectedPrinter.id).catch(() => undefined);
      }
    } catch (err) {
      const message = getMqttErrorMessage(err);
      setCommandStates((prev) => ({
        ...prev,
        [command.id]: {
          ...(prev[command.id] ?? {
            payloadText: stringifyPayload(command.payload),
            result: null,
          }),
          status: "error",
          error: message,
          result: null,
        },
      }));
      toast.error(message);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
              <Printer className="size-5 text-accent" />
              Enajenación MQTT manual
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Selecciona una impresora, revisa cada JSON, publícalo manualmente
              y avanza sólo cuando el broker acepte el paso. Cada respuesta queda
              visible para debugging.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="block lg:col-span-2">
            <span className="mb-1.5 block text-sm font-medium">
              Impresora (asignada / laboratorio)
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
          </label>

          {topics && selectedPrinter && (
            <div className="lg:col-span-2 rounded-lg border border-border bg-foreground/[0.02] p-4 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted">CmdServer</dt>
                  <dd className="font-mono text-xs break-all">
                    {topics.cmdServer}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Comando</dt>
                  <dd className="font-mono text-xs break-all">
                    {topics.comando}
                  </dd>
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
                  <dd className="font-mono text-xs break-all">
                    {topics.monitor}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

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
          {selectedPrinter && (
            <button
              type="button"
              onClick={() => void refreshPrinterStatus(selectedPrinter.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5"
            >
              <RefreshCw className="size-4" />
              Actualizar estado
            </button>
          )}
        </div>
      </section>

      {manualCommands.length > 0 && (
        <section className="space-y-3">
          {manualCommands.map((command, index) => {
            const state =
              commandStates[command.id] ??
              ({
                payloadText: stringifyPayload(command.payload),
                status: "pending",
                result: null,
                error: null,
              } satisfies CommandState);
            const locked = index > activeStepIndex;
            const isRunning = state.status === "running";
            const isSuccess = state.status === "success";

            return (
              <article
                key={command.id}
                className={cn(
                  "rounded-xl border border-border bg-card p-4 shadow-sm",
                  locked && "opacity-60",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-card-foreground">
                        {command.label}
                      </h3>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          state.status === "success" &&
                            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                          state.status === "error" &&
                            "bg-rose-500/10 text-rose-700 dark:text-rose-300",
                          state.status === "running" &&
                            "bg-amber-500/10 text-amber-800 dark:text-amber-200",
                          state.status === "pending" && "bg-foreground/5 text-muted",
                        )}
                      >
                        {statusLabel(state.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{command.description}</p>
                    <p className="mt-1 font-mono text-xs text-muted break-all">
                      {command.topic}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleExecute(index, command)}
                    disabled={locked || isRunning}
                    className={cn(
                      "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60",
                      isSuccess
                        ? "border border-border hover:bg-foreground/5"
                        : "bg-accent text-accent-foreground",
                    )}
                  >
                    {isRunning ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isSuccess ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    {isSuccess ? "Re-ejecutar" : "Ejecutar"}
                  </button>
                </div>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                    Comando JSON editable
                  </span>
                  <textarea
                    value={state.payloadText}
                    onChange={(e) =>
                      handlePayloadChange(index, command.id, e.target.value)
                    }
                    onPaste={(e) => handlePayloadPaste(e, index, command.id)}
                    disabled={locked || isRunning}
                    className={cn(
                      inputClass,
                      "min-h-[120px] resize-y font-mono text-xs leading-relaxed disabled:opacity-70",
                    )}
                    spellCheck={false}
                  />
                </label>

                <p className="mt-2 text-xs text-muted">
                  Éxito esperado: {command.successHint}
                </p>

                {state.error && (
                  <p
                    role="alert"
                    className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
                  >
                    {state.error}
                  </p>
                )}

                {state.result && (
                  <div className="mt-4">
                    <JsonBlock
                      title={`Respuesta · HTTP ${state.result.httpStatus}`}
                      status="ok"
                    >
                      {JSON.stringify(state.result.response, null, 2)}
                    </JsonBlock>
                  </div>
                )}
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
                Útil para confirmar cuándo AEG Core publicó el comando que
                corresponde responder.
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

      {manualCommands.length === 0 && !printersLoading && (
        <section className="rounded-xl border border-border bg-card p-5 text-sm text-muted shadow-sm">
          No hay impresoras aptas para esta prueba. Deben tener estatus Asignada o
          Laboratorio, cliente, serial fiscal y MAC.
        </section>
      )}
    </div>
  );
}
