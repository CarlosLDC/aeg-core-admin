"use client";

import { ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/context/toast-provider";
import { useEnajenacionActivity } from "@/hooks/use-enajenacion-activity";
import {
  activityResultLabel,
  directionLabel,
} from "@/lib/enajenacion-activity";
import { getMqttErrorMessage } from "@/lib/mqtt-api";
import { cn } from "@/lib/utils";
import type {
  EnajenacionActivityEntry,
  EnajenacionActivityResult,
} from "@/types/mqtt";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

function resultBadgeClass(result: EnajenacionActivityResult): string {
  switch (result) {
    case "PROCESSED":
    case "PUBLISHED":
    case "COMPLETED":
      return "bg-violet-500/10 text-violet-800 dark:text-violet-200";
    case "RECEIVED":
      return "bg-sky-500/10 text-sky-800 dark:text-sky-200";
    case "IGNORED":
      return "bg-amber-500/10 text-amber-800 dark:text-amber-200";
    case "REJECTED":
    case "FAILED":
      return "bg-red-500/10 text-red-700 dark:text-red-300";
    default:
      return "bg-foreground/5 text-muted";
  }
}

function formatPayload(payload: string | null): string {
  if (!payload) {
    return "—";
  }
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}

export function EnajenacionActivityPanel() {
  const activity = useEnajenacionActivity();
  const toast = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleRefresh() {
    try {
      await activity.refetch();
      toast.success("Actividad actualizada");
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <p className="rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-xs text-muted">
        Intercambios MQTT de enajenación en el servidor: solicitudes de las
        impresoras, comandos publicados y si cada mensaje fue procesado,
        ignorado o falló.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 space-y-1">
          <span className="text-xs font-medium text-muted">Filtrar por MAC</span>
          <input
            type="text"
            value={activity.macFilter}
            onChange={(e) => activity.setMacFilter(e.target.value)}
            className={cn(inputClass, "font-mono")}
            placeholder="20:6E:F1:88:4C:68 o compacta"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              activity.polling
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-foreground/5 text-muted",
            )}
          >
            {activity.polling ? "En vivo" : "Pausado"}
          </span>
          <button
            type="button"
            onClick={() => activity.setPolling((value) => !value)}
            className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-card-foreground"
          >
            {activity.polling ? "Pausar" : "Reanudar"}
          </button>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={activity.refreshing}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-card-foreground disabled:opacity-50"
          >
            {activity.refreshing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Actualizar
          </button>
        </div>
      </div>

      {activity.sessions.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-card-foreground">
            Sesiones activas ({activity.sessions.length})
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {activity.sessions.map((session) => (
              <li
                key={session.mac}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-xs">{session.mac}</span>
                  <span className="text-xs text-muted">{session.state}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Serial:{" "}
                  <span className="text-card-foreground">{session.ptrReg}</span>
                  {session.awaitingResponse ? " · esperando respuesta" : null}
                </p>
                {session.lastError ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {session.lastError}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-medium text-card-foreground">
          Actividad reciente ({activity.entries.length})
        </h3>

        {activity.loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            Cargando…
          </div>
        ) : activity.error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-4 text-sm text-red-700 dark:text-red-300">
            {activity.error}
          </p>
        ) : activity.entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted">
            Sin actividad de enajenación reciente.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-border bg-foreground/[0.02] text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Hora</th>
                  <th className="px-3 py-2 font-medium">MAC</th>
                  <th className="px-3 py-2 font-medium">Serial</th>
                  <th className="px-3 py-2 font-medium">Dir.</th>
                  <th className="px-3 py-2 font-medium">Tópico</th>
                  <th className="px-3 py-2 font-medium">Resultado</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {activity.entries.map((entry) => (
                  <ActivityRow
                    key={entry.id}
                    entry={entry}
                    expanded={expandedId === entry.id}
                    onToggle={() =>
                      setExpandedId((current) =>
                        current === entry.id ? null : entry.id,
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function ActivityRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: EnajenacionActivityEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasPayload = Boolean(entry.payload || entry.detail);
  return (
    <>
      <tr className="border-b border-border/70 hover:bg-foreground/[0.02]">
        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
          {new Date(entry.at).toLocaleTimeString()}
        </td>
        <td className="px-3 py-2 font-mono text-xs">{entry.mac || "—"}</td>
        <td className="px-3 py-2 text-xs">{entry.ptrReg ?? "—"}</td>
        <td className="px-3 py-2 text-xs">{directionLabel(entry.direction)}</td>
        <td className="max-w-[12rem] truncate px-3 py-2 font-mono text-xs">
          {entry.topic ?? "—"}
        </td>
        <td className="px-3 py-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              resultBadgeClass(entry.result),
            )}
          >
            {activityResultLabel(entry.result)}
          </span>
        </td>
        <td className="px-3 py-2 text-xs text-muted">
          {entry.sessionState ?? "—"}
        </td>
        <td className="px-3 py-2">
          {hasPayload ? (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center text-muted hover:text-card-foreground"
              aria-expanded={expanded}
              aria-label={expanded ? "Ocultar payload" : "Ver payload"}
            >
              {expanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          ) : null}
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-border bg-foreground/[0.02]">
          <td colSpan={8} className="px-3 py-3">
            {entry.detail ? (
              <p className="mb-2 text-xs text-muted">{entry.detail}</p>
            ) : null}
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-card-foreground">
              {formatPayload(entry.payload)}
            </pre>
          </td>
        </tr>
      ) : null}
    </>
  );
}
