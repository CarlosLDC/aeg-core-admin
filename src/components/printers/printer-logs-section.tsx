"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  Search,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { usePrinterLogs } from "@/hooks/use-printer-logs";
import { PrinterLogsDeleteDialog } from "@/components/printers/printer-logs-delete-dialog";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import type { PrinterResponse } from "@/types/printer";
import type { PrinterMqttLogItem } from "@/types/printer-logs";

type PrinterLogsSectionProps = {
  printer: PrinterResponse;
};

function formatTimestamp(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("es-VE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
      hour12: false,
    });
  } catch {
    return isoStr;
  }
}

function formatPayload(payload: string): string {
  try {
    const parsed = JSON.parse(payload);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return payload;
  }
}

export function PrinterLogsSection({ printer }: PrinterLogsSectionProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const toast = useToast();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
    : "—";
  const expectedTopic = printer.macAddress
    ? `/${compactMac}/AEG_Fiscal/Integracion/DebugMQTT`
    : "—";

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function handleCopyPayload(item: PrinterMqttLogItem) {
    void navigator.clipboard.writeText(item.payload);
    toast.success("Payload copiado al portapapeles");
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
    a.download = `printer-logs-${printer.fiscalSerial}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo de logs descargado");
  }

  function handleResetFilters() {
    setFrom("");
    setTo("");
    setSearch("");
    setPage(0);
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-card-foreground">
              Monitoreo de logs
            </h3>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                liveEnabled && liveConnected
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : liveEnabled
                    ? "bg-amber-500/10 text-amber-800 dark:text-amber-200"
                    : "bg-foreground/5 text-muted",
              )}
            >
              {liveEnabled && liveConnected ? (
                <>
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  En vivo
                </>
              ) : liveEnabled ? (
                <>
                  <Wifi className="size-3 animate-pulse" /> Conectando…
                </>
              ) : (
                <>
                  <WifiOff className="size-3" /> Pausado
                </>
              )}
            </span>
          </div>
          <p className="font-mono text-xs text-muted">
            Tópico:{" "}
            <span className="text-card-foreground">{expectedTopic}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLiveEnabled(!liveEnabled)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              liveEnabled
                ? "border-amber-500/30 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-200"
                : "border-border bg-foreground/5 text-card-foreground hover:bg-foreground/10",
            )}
            title={liveEnabled ? "Pausar recepción en vivo" : "Reanudar recepción en vivo"}
          >
            {liveEnabled ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {liveEnabled ? "Pausar" : "En vivo"}
          </button>

          <button
            type="button"
            onClick={() => void refetch()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-foreground/5 disabled:opacity-50"
            title="Refrescar historial"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refrescar
          </button>

          <button
            type="button"
            onClick={handleDownloadLogs}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-foreground/5 disabled:opacity-50"
            title="Descargar logs actuales en JSON"
          >
            <Download className="size-3.5" />
            Exportar
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-500/20 dark:text-red-300"
              title="Borrar logs por rango de fecha"
            >
              <Trash2 className="size-3.5" />
              Borrar por fecha
            </button>
          ) : null}
        </div>
      </div>

      {/* Search & Date/Time Filter Toolbar */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1 text-xs font-medium text-muted">
            <span>Fecha y hora desde</span>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
              className={cn(formFieldInputClass, "text-xs")}
            />
          </label>

          <label className="block space-y-1 text-xs font-medium text-muted">
            <span>Fecha y hora hasta</span>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
              className={cn(formFieldInputClass, "text-xs")}
            />
          </label>

          <label className="block space-y-1 text-xs font-medium text-muted">
            <span>Buscar en contenido</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Filtrar por texto..."
                className={cn(formFieldInputClass, "pl-8 text-xs")}
              />
            </div>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setOrder(order === "desc" ? "asc" : "desc")}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground hover:bg-foreground/5"
              title={`Orden actual: ${order === "desc" ? "Más recientes primero" : "Más antiguos primero"}`}
            >
              {order === "desc" ? (
                <>
                  <ArrowDown className="size-3.5" /> Recientes primero
                </>
              ) : (
                <>
                  <ArrowUp className="size-3.5" /> Antiguos primero
                </>
              )}
            </button>

            {(from || to || search) ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-card-foreground"
              >
                Limpiar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Terminal View */}
      <div className="rounded-lg border border-border bg-neutral-950 text-neutral-100 shadow-inner">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="font-mono">Terminal de logs</span>
          </div>
          <div>
            Total registros: <span className="font-mono font-medium text-neutral-200">{total}</span>
          </div>
        </div>

        <div className="max-h-[500px] min-h-[260px] overflow-y-auto p-3 font-mono text-xs space-y-1.5">
          {loading && logs.length === 0 ? (
            <div className="flex h-48 items-center justify-center gap-2 text-neutral-400">
              <Loader2 className="size-5 animate-spin" />
              <span>Cargando logs...</span>
            </div>
          ) : error ? (
            <div className="flex h-48 items-center justify-center text-red-400">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-1 text-neutral-500">
              <p>No hay logs registrados para los criterios seleccionados.</p>
              <p className="text-[11px]">
                Los mensajes que la impresora publique en su tópico DebugMQTT aparecerán aquí en tiempo real.
              </p>
            </div>
          ) : (
            logs.map((item) => {
              const isExpanded = expandedId === item.id;
              const formatted = formatPayload(item.payload);
              const isMultiline = formatted.includes("\n");

              return (
                <div
                  key={item.id}
                  className="group relative rounded border border-neutral-900 bg-neutral-900/60 p-2 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
                    <span className="text-neutral-500">
                      [{formatTimestamp(item.recordedAt)}]
                    </span>
                    <span className="text-sky-400 font-mono text-[10px]">
                      {item.topic}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyPayload(item)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-neutral-400 hover:text-neutral-100"
                      title="Copiar contenido"
                    >
                      <Copy className="size-3" />
                    </button>
                  </div>

                  <div className="mt-1">
                    {isMultiline && !isExpanded ? (
                      <div>
                        <pre className="whitespace-pre-wrap break-all text-neutral-200 line-clamp-3">
                          {formatted}
                        </pre>
                        <button
                          type="button"
                          onClick={() => setExpandedId(item.id)}
                          className="mt-1 text-[10px] text-sky-400 hover:underline"
                        >
                          Ver más…
                        </button>
                      </div>
                    ) : isMultiline && isExpanded ? (
                      <div>
                        <pre className="whitespace-pre-wrap break-all text-neutral-200">
                          {formatted}
                        </pre>
                        <button
                          type="button"
                          onClick={() => setExpandedId(null)}
                          className="mt-1 text-[10px] text-sky-400 hover:underline"
                        >
                          Ver menos
                        </button>
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap break-all text-neutral-200">
                        {formatted}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {total > limit ? (
          <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-2.5 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span>Por página:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(0);
                }}
                className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-neutral-200 text-xs"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span>
                Página <span className="font-semibold text-neutral-200">{page + 1}</span> de{" "}
                <span className="font-semibold text-neutral-200">{totalPages}</span>
              </span>

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0 || loading}
                  className="rounded border border-neutral-800 p-1 hover:bg-neutral-800 disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1 || loading}
                  className="rounded border border-neutral-800 p-1 hover:bg-neutral-800 disabled:opacity-40"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Delete Dialog */}
      {deleteDialogOpen ? (
        <PrinterLogsDeleteDialog
          printer={printer}
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onDeleted={(count) => {
            toast.success(`Se eliminaron ${count} logs de la impresora`);
            void refetch();
          }}
        />
      ) : null}
    </div>
  );
}
