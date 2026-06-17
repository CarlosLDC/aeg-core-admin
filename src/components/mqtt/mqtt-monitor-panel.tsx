"use client";

import { Loader2, Plug, PlugZap, Trash2 } from "lucide-react";
import { useToast } from "@/context/toast-provider";
import { useMqttMonitor } from "@/hooks/use-mqtt-monitor";
import { getMqttErrorMessage } from "@/lib/mqtt-api";
import { cn } from "@/lib/utils";
import type { MqttInboundMessage } from "@/types/mqtt";
import type { MqttWsStatus } from "@/hooks/use-mqtt-monitor";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

type MqttMonitorState = ReturnType<typeof useMqttMonitor>;

function wsLabel(status: MqttWsStatus): string {
  if (status === "open") return "Conectado";
  if (status === "connecting") return "Conectando…";
  return "Desconectado";
}

export function MqttMonitorPanel({
  monitor: monitorProp,
}: {
  monitor?: MqttMonitorState;
}) {
  const internalMonitor = useMqttMonitor();
  const monitor = monitorProp ?? internalMonitor;
  const toast = useToast();

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    try {
      await monitor.subscribeToTopic(monitor.monitorTopic);
      toast.success(`Suscrito a ${monitor.monitorTopic.trim()}`);
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <p className="rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-xs text-muted">
        Tráfico MQTT bruto del broker. La pestaña Enajenación usa un stream SSE
        separado para el progreso del ritual; suscríbete aquí a{" "}
        <code className="font-mono text-card-foreground">
          /{"{MAC}"}/AEG_Fiscal/Integracion/#
        </code>{" "}
        solo si necesitas depurar frames MQTT.
      </p>

      <form onSubmit={handleSubscribe} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={monitor.monitorTopic}
          onChange={(e) => monitor.setMonitorTopic(e.target.value)}
          className={cn(inputClass, "min-w-0 flex-1 font-mono")}
          placeholder="tópico MQTT (# permitido)"
          disabled={monitor.subscribeLoading}
          aria-label="Tópico a escuchar"
        />
        <button
          type="submit"
          disabled={monitor.subscribeLoading || monitor.initialLoading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-70"
        >
          {monitor.subscribeLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          Suscribir
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            monitor.wsStatus === "open"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : monitor.wsStatus === "connecting"
                ? "bg-amber-500/10 text-amber-800 dark:text-amber-200"
                : "bg-foreground/5 text-muted",
          )}
        >
          {wsLabel(monitor.wsStatus)}
        </span>
        {monitor.wsStatus === "open" ? (
          <button
            type="button"
            onClick={monitor.disconnectWebSocket}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-card-foreground"
          >
            <Plug className="size-3.5" />
            Desconectar
          </button>
        ) : (
          <button
            type="button"
            onClick={monitor.connectWebSocket}
            disabled={monitor.wsStatus === "connecting"}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-card-foreground disabled:opacity-50"
          >
            {monitor.wsStatus === "connecting" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <PlugZap className="size-3.5" />
            )}
            Conectar
          </button>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-card-foreground">
            Mensajes ({monitor.messages.length})
          </h3>
          {monitor.messages.length > 0 && (
            <button
              type="button"
              onClick={monitor.clearMessages}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-card-foreground"
            >
              <Trash2 className="size-3.5" />
              Limpiar
            </button>
          )}
        </div>

        {monitor.initialLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            Cargando…
          </div>
        ) : monitor.messages.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted">
            Sin mensajes. Suscríbete a un tópico para empezar.
          </p>
        ) : (
          <ul className="max-h-[32rem] space-y-2 overflow-auto">
            {monitor.messages.map((message, index) => (
              <MessageRow
                key={`${message.receivedAt}-${message.topic}-${index}`}
                message={message}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function MessageRow({ message }: { message: MqttInboundMessage }) {
  return (
    <li className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <code className="min-w-0 flex-1 truncate font-mono text-xs">
          {message.topic}
        </code>
        <time className="shrink-0 text-xs text-muted">
          {new Date(message.receivedAt).toLocaleTimeString()}
        </time>
      </div>
      <pre className="mt-1.5 max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-card-foreground">
        {message.payload}
      </pre>
    </li>
  );
}
