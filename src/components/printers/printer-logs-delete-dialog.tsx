"use client";

import { useId, useState, type FormEvent } from "react";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { deletePrinterLogs, getPrinterLogsErrorMessage } from "@/lib/printer-logs-api";
import type { PrinterResponse } from "@/types/printer";
import type { DeletePrinterLogsParams } from "@/types/printer-logs";

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
  const [mode, setMode] = useState<"before" | "range">("before");
  const [before, setBefore] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

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
      submitLabel="Eliminar logs"
      submitDestructive
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Esta acción eliminará de forma permanente los registros de logs
          almacenados en la base de datos para esta impresora según el criterio seleccionado.
        </p>

        <div className="flex gap-4 text-sm font-medium">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="deleteMode"
              checked={mode === "before"}
              onChange={() => setMode("before")}
              className="accent-primary"
            />
            <span>Anteriores a una fecha</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="deleteMode"
              checked={mode === "range"}
              onChange={() => setMode("range")}
              className="accent-primary"
            />
            <span>Rango de fechas</span>
          </label>
        </div>

        {mode === "before" ? (
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-card-foreground">
              Borrar logs anteriores a (Fecha y Hora)
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
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-card-foreground">Desde</span>
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                disabled={saving}
                className={formFieldInputClass}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-card-foreground">Hasta</span>
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
