"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  PrinterSelect,
  type PrinterSelectOption,
} from "@/components/printers/printer-select";
import {
  emptySerialRangeForm,
  SerialRangeFields,
  type SerialRangeFormValues,
} from "@/components/ui/serial-range-fields";
import {
  emptySealForm,
  SEAL_COLOR_LABELS,
  SEAL_STATUS_LABELS,
  type SealFormValues,
} from "@/lib/seal-form";
import { buildSerialRange } from "@/lib/serial-range";
import { SEAL_COLORS, SEAL_STATUSES } from "@/types/seal";
import { cn } from "@/lib/utils";

export type SealBatchSubmitPayload = {
  serials: string[];
  base: Omit<SealFormValues, "serial">;
};

type SealBatchFormDialogProps = {
  open: boolean;
  saving: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  printerOptions: PrinterSelectOption[];
  printersLoading: boolean;
  onClose: () => void;
  onSubmit: (payload: SealBatchSubmitPayload) => void;
};

export function SealBatchFormDialog({
  open,
  saving,
  progress,
  error,
  printerOptions,
  printersLoading,
  onClose,
  onSubmit,
}: SealBatchFormDialogProps) {
  const [range, setRange] = useState<SerialRangeFormValues>(emptySerialRangeForm);
  const [form, setForm] = useState<Omit<SealFormValues, "serial">>(emptySealForm());

  useEffect(() => {
    if (!open) return;
    setRange(emptySerialRangeForm());
    setForm(emptySealForm());
  }, [open]);

  if (!open) return null;

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";
  const disabled = saving || printersLoading;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const digitLength = Number(range.digitLength) || 7;
    const serials = buildSerialRange(
      { ...range, digitLength },
      { mode: "flexible" },
    );
    if (typeof serials === "string") return;
    onSubmit({ serials, base: form });
  }

  const busy = saving;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
        disabled={busy}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              Crear precintos por lote
            </h2>
            <p className="mt-1 text-sm text-muted">
              Mismo color, estatus e impresora para todos; los seriales se generan
              del rango indicado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        {progress && progress.total > 0 && (
          <p className="mb-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 shrink-0 animate-spin" />
            Creando {Math.min(progress.done + 1, progress.total)} de{" "}
            {progress.total}…
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <SerialRangeFields
            mode="flexible"
            values={range}
            onChange={setRange}
            disabled={disabled}
          />

          <div className="block">
            <span className="mb-1.5 block text-sm font-medium">Impresora</span>
            {printerOptions.length > 0 ? (
              <PrinterSelect
                value={form.printerId}
                onChange={(printerId) =>
                  setForm((f) => ({ ...f, printerId }))
                }
                options={printerOptions}
                disabled={disabled}
                loading={printersLoading}
              />
            ) : (
              <input
                type="number"
                min={1}
                value={form.printerId}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, printerId: e.target.value }))
                }
                className={inputClass}
                placeholder="ID de impresora (opcional)"
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Color</span>
              <select
                required
                value={form.color}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    color: e.target.value as SealFormValues["color"],
                  }))
                }
                className={inputClass}
              >
                {SEAL_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {SEAL_COLOR_LABELS[color]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Estatus</span>
              <select
                required
                value={form.status}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as SealFormValues["status"],
                  }))
                }
                className={inputClass}
              >
                {SEAL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SEAL_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={disabled}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                busy && "cursor-not-allowed opacity-70",
              )}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Crear lote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
