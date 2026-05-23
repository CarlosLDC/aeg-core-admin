"use client";

import { useState } from "react";
import {
  Activity,
  Loader2,
  MessageSquare,
  Plug,
  PlugZap,
  RadioTower,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useToast } from "@/context/toast-provider";
import { useMqttMonitor } from "@/hooks/use-mqtt-monitor";
import { getMqttErrorMessage } from "@/lib/mqtt-api";
import { formatDateTime } from "@/lib/datetime-form";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import type { MqttInboundMessage, MqttMonitorStatus } from "@/types/mqtt";
import type { MqttWsStatus } from "@/hooks/use-mqtt-monitor";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "ok" | "warn" | "neutral" | "error";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "ok" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        tone === "warn" &&
          "bg-amber-500/10 text-amber-800 dark:text-amber-200",
        tone === "error" && "bg-rose-500/10 text-rose-700 dark:text-rose-300",
        tone === "neutral" && "bg-foreground/5 text-muted",
      )}
    >
      {label}
    </span>
  );
}

export function MqttMonitorPanel() {
  const toast = useToast();
  const monitor = useMqttMonitor();
  const [refreshing, setRefreshing] = useState(false);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    try {
      await monitor.subscribeToTopic(monitor.monitorTopic);
      toast.success(`Suscrito a ${monitor.monitorTopic.trim()}`);
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await monitor.refreshMonitor();
      toast.success("Estado actualizado.");
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }

  const wsTone =
    monitor.wsStatus === "open"
      ? "ok"
      : monitor.wsStatus === "connecting"
        ? "warn"
        : "neutral";

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold text-card-foreground">
        <Activity className="size-5 text-accent" />
        Monitor en vivo
      </h2>

      <p className="mt-1 text-sm text-muted">
        Escucha un solo tópico a la vez. El servidor se suscribe al broker y
        reenvía los mensajes por WebSocket. Usa comodines MQTT (
        <code className="text-xs">#</code>, <code className="text-xs">+</code>)
        si el broker lo permite.
      </p>

      <MonitorStatusRow
        initialLoading={monitor.initialLoading}
        monitorStatus={monitor.monitorStatus}
        subscriptionActive={monitor.subscriptionActive}
        wsStatus={monitor.wsStatus}
        wsTone={wsTone}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <form
        onSubmit={handleSubscribe}
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 block text-sm font-medium">
            Tópico a escuchar
          </span>
          <input
            type="text"
            value={monitor.monitorTopic}
            onChange={(e) => monitor.setMonitorTopic(e.target.value)}
            className={cn(inputClass, "font-mono")}
            placeholder="aeg/test/#"
            disabled={monitor.subscribeLoading}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={monitor.subscribeLoading || monitor.initialLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-70"
          >
            {monitor.subscribeLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RadioTower className="size-4" />
            )}
            Suscribir
          </button>
          {monitor.wsStatus === "open" ? (
            <button
              type="button"
              onClick={monitor.disconnectWebSocket}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-foreground/5"
            >
              <Plug className="size-4" />
              Desconectar
            </button>
          ) : (
            <button
              type="button"
              onClick={monitor.connectWebSocket}
              disabled={monitor.wsStatus === "connecting"}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
            >
              {monitor.wsStatus === "connecting" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PlugZap className="size-4" />
              )}
              Conectar en vivo
            </button>
          )}
        </div>
      </form>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-card-foreground">
            Mensajes recibidos ({monitor.messages.length})
          </h3>
          <button
            type="button"
            onClick={monitor.clearMessages}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-foreground/5"
          >
            <Trash2 className="size-3.5" />
            Limpiar vista
          </button>
        </div>

        {monitor.initialLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border py-12 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            Cargando monitor…
          </div>
        ) : monitor.messages.length === 0 ? (
          <EmptyState
            compact
            className="rounded-lg border border-dashed border-border py-10"
            icon={MessageSquare}
            title="Aún no hay mensajes."
            description="Suscríbete a un tópico y publica o espera telemetría de dispositivos IoT."
          />
        ) : (
          <MessagesTable messages={monitor.messages} />
        )}
      </div>
    </section>
  );
}

function MonitorStatusRow({
  initialLoading,
  monitorStatus,
  subscriptionActive,
  wsStatus,
  wsTone,
  refreshing,
  onRefresh,
}: {
  initialLoading: boolean;
  monitorStatus: MqttMonitorStatus | null;
  subscriptionActive: boolean;
  wsStatus: MqttWsStatus;
  wsTone: "ok" | "warn" | "neutral";
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <StatusBadge
        label={
          wsStatus === "open"
            ? "WebSocket conectado"
            : wsStatus === "connecting"
              ? "Conectando…"
              : "WebSocket desconectado"
        }
        tone={wsTone}
      />
      {!initialLoading && monitorStatus && (
        <>
          <StatusBadge
            label={
              monitorStatus.inboundEnabled
                ? "Inbound activo"
                : "Inbound desactivado"
            }
            tone={monitorStatus.inboundEnabled ? "ok" : "error"}
          />
          <StatusBadge
            label={
              subscriptionActive ? "Suscripción activa" : "Suscripción inactiva"
            }
            tone={subscriptionActive ? "ok" : "warn"}
          />
          {monitorStatus.lastMessageAt && (
            <span className="text-xs text-muted">
              Último mensaje: {formatDateTime(monitorStatus.lastMessageAt)}
            </span>
          )}
        </>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing || initialLoading}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-foreground/5 disabled:opacity-50"
      >
        {refreshing ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
        Actualizar
      </button>
    </div>
  );
}

function MessagesTable({ messages }: { messages: MqttInboundMessage[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="max-h-[28rem] overflow-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="sticky top-0 bg-card text-muted">
            <tr className="border-b border-border">
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">
                Recibido
              </th>
              <th className="whitespace-nowrap px-4 py-2.5 font-medium">Tópico</th>
              <th className="px-4 py-2.5 font-medium">Payload</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((row, index) => (
              <tr
                key={`${row.receivedAt}-${row.topic}-${index}`}
                className="border-b border-border/60 last:border-0"
              >
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {formatDateTime(row.receivedAt)}
                </td>
                <td className="max-w-[12rem] truncate px-4 py-3 font-mono text-xs">
                  {row.topic}
                </td>
                <td className="px-4 py-3">
                  <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-card-foreground">
                    {row.payload}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
