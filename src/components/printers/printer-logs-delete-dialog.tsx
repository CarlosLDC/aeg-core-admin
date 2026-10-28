"use client";

import { useId, useState, type FormEvent } from "react";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import {
  SegmentedToggle,
  type SegmentedToggleOption,
} from "@/components/ui/segmented-toggle";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import {
  deletePrinterLogs,
  getPrinterLogsErrorMessage,
} from "@/lib/printer-logs-api";
import type { PrinterResponse } from "@/types/printer";
import type { DeletePrinterLogsParams } from "@/types/printer-logs";

type DeleteMode = "before" | "range";

const DELETE_MODE_OPTIONS: readonly SegmentedToggleOption<DeleteMode>[] = [
  { value: "before", label: "Anteriores a una fecha", tone: "rose" },
  { value: "range", label: "Rango de fechas", tone: "rose" },
];

function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type PrinterLogsDeleteDialogProps = {
  printer: PrinterResponse;
  open: boolean;
  onClose: () => void;
  onDeleted: (count: number) => void;
};

export function PrinterLogsDeleteDialog({
  printer,
  open,
  onClose,
  onDeleted,
}: PrinterLogsDeleteDialogProps) {
  const titleId = useId();
  const [mode, setMode] = useState<DeleteMode>("before");
  const [before, setBefore] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function applyPresetDaysAgo(days: number) {
    const cutoff = new Date();
    cutoff.setTime(cutoff.getTime() - days * 24 * 60 * 60 * 1000);
    setMode("before");
    setBefore(toLocalDatetimeInputValue(cutoff));
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const params: DeletePrinterLogsParams = {};
    if (mode === "before") {
      if (!before) {
        setError("Selecciona una fecha y hora límite.");
        return;
      }
      params.before = new Date(before).toISOString();
    } else {
      if (!from && !to) {
        setError("Selecciona al menos una fecha (desde o hasta).");
        return;
      }
      if (from && to && new Date(from) > new Date(to)) {
        setError("La fecha inicial no puede ser posterior a la fecha final.");
        return;
      }
      if (from) params.from = new Date(from).toISOString();
      if (to) params.to = new Date(to).toISOString();
    }

    setSaving(true);
    try {
      const res = await deletePrinterLogs(printer.id, params);
      onDeleted(res.deletedCount);
      onClose();
    } catch (err) {
      setError(getPrinterLogsErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PrinterActionDialogShell
      title="Eliminar logs por fecha"
      titleId={titleId}
      printer={printer}
      saving={saving}
      error={error}
      onClose={onClose}
      submitLabel="Eliminar registros"
      submitDestructive
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            Los registros seleccionados se eliminarán por lotes de forma
            permanente de la base de datos. Esta acción no se puede deshacer.
          </p>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-muted">
            Modo de limpieza
          </span>
          <SegmentedToggle
            value={mode}
            onChange={(next) => {
              setMode(next);
              setError(null);
            }}
            options={DELETE_MODE_OPTIONS}
            disabled={saving}
            ariaLabel="Modo de limpieza de logs"
          />
        </div>

        {mode === "before" ? (
          <div className="space-y-3">
            <label className="block space-y-1.5 text-sm">
              <span className="text-xs font-medium text-muted">
                Eliminar registros anteriores a
              </span>
              <input
                type="datetime-local"
                value={before}
                onChange={(e) => setBefore(e.target.value)}
                disabled={saving}
                className={formFieldInputClass}
                required
              />
            </label>

            <div className="space-y-1.5">
              <span className="flex items-center gap-1 text-xs text-muted">
                <CalendarClock className="size-3.5" />
                Atajos rápidos
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Hace > 24 h", days: 1 },
                  { label: "Hace > 7 días", days: 7 },
                  { label: "Hace > 30 días", days: 30 },
                  { label: "Hace > 90 días", days: 90 },
                ].map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    disabled={saving}
                    onClick={() => applyPresetDaysAgo(preset.days)}
                    className="rounded-md border border-border bg-foreground/[0.02] px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-card-foreground disabled:opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm">
              <span className="text-xs font-medium text-muted">
                Desde (Fecha y hora)
              </span>
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                disabled={saving}
                className={formFieldInputClass}
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-xs font-medium text-muted">
                Hasta (Fecha y hora)
              </span>
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={saving}
                className={formFieldInputClass}
              />
            </label>
          </div>
        )}
      </div>
    </PrinterActionDialogShell>
  );
}
