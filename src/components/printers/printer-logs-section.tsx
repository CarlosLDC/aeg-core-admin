"use client";

import { useState, type MouseEvent } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eraser,
  Loader2,
  Pause,
  Play,
  RefreshCw,
   RotateCcw,
  ScrollText,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { usePrinterLogs } from "@/hooks/use-printer-logs";
import { PrinterLogsDeleteDialog } from "@/components/printers/printer-logs-delete-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  formFieldInputClass,
  formFieldNativeSelectClass,
  formFieldSearchInputClass,
} from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import type { PrinterResponse } from "@/types/printer";
import type { PrinterMqttLogItem } from "@/types/printer-logs";

type PrinterLogsSectionProps = {
  printer: PrinterResponse;
};

const PAGE_LIMIT_OPTIONS = [25, 50, 100] as const;

function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDatePart(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

function formatTimePart(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("es-VE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
      hour12: false,
    });
  } catch {
    return "";
  }
}

function parsePayloadInfo(payload: string): {
  isJson: boolean;
  formatted: string;
  preview: string;
} {
  const trimmed = payload.trim();
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      const compact = JSON.stringify(parsed);
      return {
        isJson: true,
        formatted: JSON.stringify(parsed, null, 2),
        preview: compact,
      };
    } catch {
      // Fall through to plain text
    }
  }
  const singleLine = payload.replace(/\s+/g, " ").trim();
  return {
    isJson: false,
    formatted: payload,
    preview: singleLine || "—",
  };
}

export function PrinterLogsSection({ printer }: PrinterLogsSectionProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const toast = useToast();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | "topic" | null>(null);

  const {
    logs,
    total,
    page,
    limit,
    loading,
    error,
    from,
    to,
    search,
    order,
    liveEnabled,
    liveConnected,
    setPage,
    setLimit,
    setFrom,
    setTo,
    setSearch,
    setOrder,
    setLiveEnabled,
    refetch,
  } = usePrinterLogs(printer.id, printer.macAddress);

  const compactMac = printer.macAddress
    ? printer.macAddress.replace(/[:-]/g, "").toUpperCase()
    : null;
  const expectedTopic = compactMac
    ? `/${compactMac}/AEG_Fiscal/Integracion/DebugMQTT`
    : null;

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = total === 0 ? 0 : page * limit + 1;
  const endIndex = Math.min(total, (page + 1) * limit);
  const hasActiveFilters = Boolean(from || to || search.trim());

  async function handleCopyText(
    text: string,
    key: number | "topic",
    label: string,
    event?: MouseEvent,
  ) {
    event?.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      toast.success(label);
      window.setTimeout(() => {
        setCopiedId((current) => (current === key ? null : current));
      }, 1800);
    } catch {
      toast.error("No se pudo copiar al portapapeles");
    }
  }

  function handleDownloadLogs() {
    if (logs.length === 0) {
      toast.error("No hay logs disponibles para exportar");
      return;
    }
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${printer.fiscalSerial}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo JSON descargado");
  }

  function applyQuickRange(hoursAgo: number) {
    const now = new Date();
    const start = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    setFrom(toLocalDatetimeInputValue(start));
    setTo("");
    setPage(0);
  }

  function applyTodayRange() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    setFrom(toLocalDatetimeInputValue(startOfToday));
    setTo("");
    setPage(0);
  }

  function handleResetFilters() {
    setFrom("");
    setTo("");
    setSearch("");
    setPage(0);
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      {/* Encabezado y barra de acciones */}
      <div className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-sm font-semibold text-card-foreground">
              Monitoreo de logs
            </h3>

            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                !compactMac
                  ? "bg-foreground/5 text-muted"
                  : liveEnabled && liveConnected
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : liveEnabled
                      ? "bg-amber-500/10 text-amber-800 dark:text-amber-200"
                      : "bg-foreground/5 text-muted",
              )}
            >
              {liveEnabled && liveConnected && compactMac ? (
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
              ) : null}
              {!compactMac
                ? "Sin MAC"
                : liveEnabled && liveConnected
                  ? "En vivo"
                  : liveEnabled
                    ? "Conectando…"
                    : "Pausado"}
            </span>

            {total > 0 ? (
              <span className="rounded-full bg-foreground/[0.04] px-2.5 py-0.5 font-mono text-xs text-muted">
                {total.toLocaleString("es-VE")}{" "}
                {total === 1 ? "registro" : "registros"}
              </span>
            ) : null}
          </div>

          {expectedTopic ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <span>Tópico de captura:</span>
              <button
                type="button"
                onClick={(e) =>
                  void handleCopyText(expectedTopic, "topic", "Tópico copiado", e)
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-foreground/[0.02] px-2 py-0.5 font-mono text-xs text-card-foreground transition-colors hover:bg-foreground/5"
                title="Copiar tópico MQTT"
              >
                <span className="truncate">{expectedTopic}</span>
                {copiedId === "topic" ? (
                  <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="size-3 text-muted" />
                )}
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted">
              Asigna una dirección MAC a esta impresora para recibir logs del
              firmware.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!compactMac}
            onClick={() => setLiveEnabled((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
          >
            {liveEnabled ? (
              <>
                <Pause className="size-3.5 text-muted" />
                Pausar
              </>
            ) : (
              <>
                <Play className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Reanudar
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => void refetch()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin text-muted" />
            ) : (
              <RefreshCw className="size-3.5 text-muted" />
            )}
            Actualizar
          </button>

          <button
            type="button"
            onClick={handleDownloadLogs}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
          >
            <Download className="size-3.5 text-muted" />
            Exportar
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300"
            >
              <Eraser className="size-3.5" />
              Limpiar por fecha
            </button>
          ) : null}
        </div>
      </div>

      {/* Filtros de búsqueda por fecha, hora y contenido */}
      <div className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted">
              Desde (Fecha y hora)
            </span>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
              className={formFieldInputClass}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted">
              Hasta (Fecha y hora)
            </span>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
              className={formFieldInputClass}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted">
              Buscar en contenido
            </span>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Comando, código o texto…"
                className={ cn(formFieldSearchInputClass, search && "pr-8") }
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(0);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted">Orden</span>
            <div className="relative">
              <select
                value={order}
                onChange={(e) => {
                  setOrder(e.target.value as "asc" | "desc");
                  setPage(0);
                }}
                className={formFieldNativeSelectClass}
              >
                <option value="desc">Más recientes primero</option>
                <option value="asc">Más antiguos primero</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
            </div>
          </label>
        </div>

        {/* Atajos rápidos de rango temporal */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted">Rango rápido:</span>
            <button
              type="button"
              onClick={() => applyQuickRange(1)}
              className="rounded-md border border-border bg-foreground/[0.02] px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-card-foreground"
            >
              Última hora
            </button>
            <button
              type="button"
              onClick={applyTodayRange}
              className="rounded-md border border-border bg-foreground/[0.02] px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-card-foreground"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange(24)}
              className="rounded-md border border-border bg-foreground/[0.02] px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-card-foreground"
            >
              Últimas 24 h
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange(24 * 7)}
              className="rounded-md border border-border bg-foreground/[0.02] px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-card-foreground"
            >
              Últimos 7 días
            </button>
          </div>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              <RotateCcw className="size-3" />
              Restablecer filtros
            </button>
          ) : null}
        </div>
      </div>

      {/* Tabla / Visor de registros */}
      <div className="mt-4">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border py-14 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            Cargando registros de logs…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border">
            <EmptyState
              compact
              icon={ScrollText}
              title={
                hasActiveFilters
                  ? "No se encontraron logs en el rango seleccionado"
                  : "Aún no hay registros de logs para esta impresora"
              }
              description="Los mensajes publicados por la impresora en el tópico DebugMQTT se guardan automáticamente en la base de datos aunque nadie tenga abierta esta vista."
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-foreground/[0.02] text-xs font-medium text-muted">
                    <th className="w-44 px-4 py-2.5">Fecha y hora</th>
                    <th className="w-24 px-3 py-2.5">Tipo</th>
                    <th className="px-4 py-2.5">Mensaje / Payload</th>
                    <th className="w-24 px-4 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {logs.map((item) => {
                    const isExpanded = expandedId === item.id;
                    const info = parsePayloadInfo(item.payload);
                    const isCopied = copiedId === item.id;

                    return (
                      <LogTableRow
                        key={item.id}
                        item={item}
                        info={info}
                        expanded={isExpanded}
                        copied={isCopied}
                        onToggle={() =>
                          setExpandedId((curr) =>
                            curr === item.id ? null : item.id,
                          )
                        }
                        onCopy={(e) =>
                          void handleCopyText(
                            info.formatted,
                            item.id,
                            "Payload copiado",
                            e,
                          )
                        }
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex flex-col gap-3 border-t border-border bg-foreground/[0.01] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs text-muted sm:text-left">
                Mostrando{" "}
                <span className="font-medium text-foreground">{startIndex}</span>
                –<span className="font-medium text-foreground">{endIndex}</span>{" "}
                de{" "}
                <span className="font-medium text-foreground">
                  {total.toLocaleString("es-VE")}
                </span>
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
                <label className="flex items-center gap-2 text-xs text-muted">
                  <span>Filas por página</span>
                  <div className="relative">
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(0);
                      }}
                      className="h-8 appearance-none rounded-lg border border-border bg-background pl-2.5 pr-7 text-xs text-foreground outline-none focus:border-accent"
                    >
                      {PAGE_LIMIT_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted"
                      aria-hidden
                    />
                  </div>
                </label>

                <nav
                  aria-label="Paginación de logs"
                  className="flex items-center gap-1"
                >
                  <button
                    type="button"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0 || loading}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="min-w-[6.5rem] px-2 text-center text-xs text-foreground">
                    Página {page + 1} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1 || loading}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de borrado por fecha */}
      {deleteDialogOpen ? (
        <PrinterLogsDeleteDialog
          printer={printer}
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onDeleted={(count) => {
            toast.success(
              `Se eliminaron ${count.toLocaleString("es-VE")} registros de logs`,
            );
            void refetch();
          }}
        />
      ) : null}
    </section>
  );
}

function LogTableRow({
  item,
  info,
  expanded,
  copied,
  onToggle,
  onCopy,
}: {
  item: PrinterMqttLogItem;
  info: { isJson: boolean; formatted: string; preview: string };
  expanded: boolean;
  copied: boolean;
  onToggle: () => void;
  onCopy: (e: MouseEvent) => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "cursor-pointer transition-colors hover:bg-foreground/[0.02]",
          expanded && "bg-foreground/[0.02]",
        )}
      >
        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">
          <span className="text-card-foreground">
            {formatDatePart(item.recordedAt)}
          </span>{" "}
          <span className="text-muted">{formatTimePart(item.recordedAt)}</span>
        </td>

        <td className="whitespace-nowrap px-3 py-2.5">
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] font-medium",
              info.isJson
                ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                : "bg-foreground/5 text-muted",
            )}
          >
            {info.isJson ? "JSON" : "TEXT"}
          </span>
        </td>

        <td className="max-w-0 px-4 py-2.5">
          <p className="truncate font-mono text-xs text-card-foreground">
            {info.preview}
          </p>
        </td>

        <td className="whitespace-nowrap px-4 py-2.5 text-right">
          <div className="inline-flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={onCopy}
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-card-foreground"
              title="Copiar payload"
              aria-label="Copiar payload"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-card-foreground"
              aria-expanded={expanded}
              aria-label={expanded ? "Contraer detalle" : "Expandir detalle"}
            >
              {expanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          </div>
        </td>
      </tr>

      {expanded ? (
        <tr className="bg-foreground/[0.015]">
          <td colSpan={4} className="px-4 py-3.5">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    Tópico:{" "}
                    <code className="font-mono text-card-foreground">
                      {item.topic}
                    </code>
                  </span>
                  <span>
                    MAC:{" "}
                    <code className="font-mono text-card-foreground">
                      {item.mac}
                    </code>
                  </span>
                  <span>
                    UTC:{" "}
                    <code className="font-mono text-card-foreground">
                      {item.recordedAt}
                    </code>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-foreground/5"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5 text-muted" />
                  )}
                  {copied ? "Copiado" : "Copiar contenido"}
                </button>
              </div>

              <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-background p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all text-card-foreground">
                {info.formatted}
              </pre>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
