"use client";

import { ChevronDown, ChevronRight, Eraser, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { useEnajenacionActivity } from "@/hooks/use-enajenacion-activity";
import {
  activityResultLabel,
  directionLabel,
} from "@/lib/enajenacion-activity";
import { getMqttErrorMessage } from "@/lib/mqtt-api";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import type {
  EnajenacionActivityEntry,
  EnajenacionActivityResult,
} from "@/types/mqtt";

const RESULT_FILTER_VALUES: EnajenacionActivityResult[] = [
  "RECEIVED",
  "PROCESSED",
  "PUBLISHED",
  "IGNORED",
  "REJECTED",
  "FAILED",
  "COMPLETED",
];

const DIRECTION_FILTER_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "INBOUND", label: "Entrada" },
  { value: "OUTBOUND", label: "Salida" },
  { value: "SESSION", label: "Sesión" },
] as const;

const inputClass = formFieldInputClass;

function resultBadgeClass(result: EnajenacionActivityResult): string {
  switch (result) {
    case "PROCESSED":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
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
  const confirm = useConfirm();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleRefresh() {
    try {
      await activity.refetch();
      toast.success("Actividad actualizada");
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    }
  }

  async function handleClear() {
    if (
      !(await confirm({
        title: "Limpiar actividad",
        message:
          "¿Eliminar todos los registros de actividad Remoto de enajenación? Esta acción no se puede deshacer.",
        destructive: true,
      }))
    ) {
      return;
    }
    try {
      await activity.clear();
      toast.success("Actividad limpiada");
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">MAC</span>
          <input
            type="text"
            value={activity.macFilter}
            onChange={(e) => activity.setMacFilter(e.target.value)}
            className={cn(inputClass, "font-mono")}
            placeholder="20:6E:F1:88:4C:68"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Serial fiscal</span>
          <input
            type="text"
            value={activity.serialFilter}
            onChange={(e) => activity.setSerialFilter(e.target.value)}
            className={cn(inputClass, "font-mono")}
            placeholder="GRA0000017"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Resultado</span>
          <select
            value={activity.resultFilter}
            onChange={(e) =>
              activity.setResultFilter(
                e.target.value as EnajenacionActivityResult | "",
              )
            }
            className={inputClass}
          >
            <option value="">Todos</option>
            {RESULT_FILTER_VALUES.map((result) => (
              <option key={result} value={result}>
                {activityResultLabel(result)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted">Dirección</span>
          <select
            value={activity.directionFilter}
            onChange={(e) =>
              activity.setDirectionFilter(
                e.target.value as typeof activity.directionFilter,
              )
            }
            className={inputClass}
          >
            {DIRECTION_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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
            disabled={activity.refreshing || activity.clearing}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-card-foreground disabled:opacity-50"
          >
            {activity.refreshing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => void handleClear()}
            disabled={
              activity.clearing ||
              activity.refreshing ||
              (activity.total === 0 && activity.entries.length === 0)
            }
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted hover:bg-rose-500/10 hover:text-rose-700 disabled:opacity-50 dark:hover:text-rose-300"
          >
            {activity.clearing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Eraser className="size-3.5" />
            )}
            Limpiar
          </button>
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
          Actividad
          {activity.total > 0
            ? activity.entries.length < activity.total
              ? ` (${activity.entries.length} de ${activity.total})`
              : ` (${activity.total})`
            : null}
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

        {activity.hasMore ? (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={activity.loadMore}
              disabled={activity.loadingMore}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-card-foreground disabled:opacity-50"
            >
              {activity.loadingMore ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Cargar más
            </button>
          </div>
        ) : null}
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
