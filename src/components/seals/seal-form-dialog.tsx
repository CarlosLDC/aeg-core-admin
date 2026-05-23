"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { zodFieldErrors } from "@/lib/form-zod";
import { sealFormSchema } from "@/lib/schemas/seal-form-schema";
import {
  emptySealForm,
  SEAL_COLOR_LABELS,
  SEAL_STATUS_LABELS,
  sealToFormValues,
  type SealFormValues,
} from "@/lib/seal-form";
import {
  PrinterSelect,
  type PrinterSelectOption,
} from "@/components/printers/printer-select";
import type { SealResponse } from "@/types/seal";
import { SEAL_COLORS, SEAL_STATUSES } from "@/types/seal";
import { cn } from "@/lib/utils";

export type { PrinterSelectOption };

type SealFormDialogProps = {
  mode: "create" | "edit";
  seal?: SealResponse;
  open: boolean;
  saving: boolean;
  error: string | null;
  printerOptions: PrinterSelectOption[];
  printersLoading: boolean;
  onClose: () => void;
  onSubmit: (values: SealFormValues) => void;
};

export function SealFormDialog({
  mode,
  seal,
  open,
  saving,
  error,
  printerOptions,
  printersLoading,
  onClose,
  onSubmit,
}: SealFormDialogProps) {
  const [form, setForm] = useState<SealFormValues>(emptySealForm());
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SealFormValues, string>>
  >({});

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && seal) {
      setForm(sealToFormValues(seal));
    } else {
      setForm(emptySealForm());
    }
    setFieldErrors({});
  }, [open, mode, seal]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = sealFormSchema.safeParse(form);
    const errors = zodFieldErrors(parsed);
    if (errors) {
      setFieldErrors(errors);
      return;
    }
    if (!parsed.success) return;
    setFieldErrors({});
    onSubmit(form);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";
  const disabled = saving || printersLoading;

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
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {mode === "create" ? "Nuevo precinto" : "Editar precinto"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Precinto fiscal con serial, color y asignación a impresora.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <FieldLabel required>Serial</FieldLabel>
            <input
              type="text"
              required
              value={form.serial}
              disabled={disabled}
              onChange={(e) =>
                setForm((f) => ({ ...f, serial: e.target.value }))
              }
              className={cn(inputClass, "font-mono")}
              placeholder="SN-001"
            />
            {fieldErrors.serial ? (
              <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                {fieldErrors.serial}
              </span>
            ) : null}
          </label>

          <div className="block">
            <FieldLabel>Impresora</FieldLabel>
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
              <FieldLabel required>Color</FieldLabel>
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
              <FieldLabel required>Estatus</FieldLabel>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>Fecha de instalación</FieldLabel>
              <input
                type="datetime-local"
                value={form.installationDate}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, installationDate: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <FieldLabel>Fecha de retiro</FieldLabel>
              <input
                type="datetime-local"
                value={form.removalDate}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, removalDate: e.target.value }))
                }
                className={inputClass}
              />
            </label>
          </div>

          <FormDialogFooter
            mode={mode}
            saving={saving}
            submitDisabled={printersLoading}
            onClose={onClose}
          />
        </form>
      </div>
    </div>
  );
}
