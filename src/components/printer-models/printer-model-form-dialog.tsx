"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import type { PrinterModelFormValues } from "@/lib/printer-model-form";
import type { PrinterModelResponse } from "@/types/printer-model";

type PrinterModelFormDialogProps = {
  mode: "create" | "edit";
  model?: PrinterModelResponse;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: PrinterModelFormValues) => void;
};

const emptyForm: PrinterModelFormValues = {
  brand: "",
  modelCode: "",
  price: "",
  providencia: "",
  approvalDate: "",
};

function toDateInputValue(iso: string | undefined): string {
  if (!iso) return "";
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
}

export function PrinterModelFormDialog({
  mode,
  model,
  open,
  saving,
  error,
  onClose,
  onSubmit,
}: PrinterModelFormDialogProps) {
  const [form, setForm] = useState<PrinterModelFormValues>(emptyForm);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && model) {
      setForm({
        brand: model.brand,
        modelCode: model.modelCode,
        price: String(model.price),
        providencia: model.providencia ?? "",
        approvalDate: toDateInputValue(model.approvalDate),
      });
    } else {
      setForm(emptyForm);
    }
    setLocalError(null);
  }, [open, mode, model]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    onSubmit(form);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

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
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {mode === "create"
                ? "Nuevo modelo fiscal"
                : "Editar modelo fiscal"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Catálogo de modelos homologados para impresoras fiscales.
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

        {(error || localError) && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {localError ?? error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Identificación del modelo
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel required>Marca</FieldLabel>
                <input
                  type="text"
                  required
                  value={form.brand}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, brand: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel required>Código de modelo</FieldLabel>
                <input
                  type="text"
                  required
                  value={form.modelCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, modelCode: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            </div>
            <label className="block">
              <FieldLabel required>Precio</FieldLabel>
              <input
                type="number"
                required
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
                className={inputClass}
              />
            </label>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Homologación
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel>Providencia</FieldLabel>
                <input
                  type="text"
                  value={form.providencia}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, providencia: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>

              <label className="block">
                <FieldLabel>Fecha de homologación</FieldLabel>
                <input
                  type="date"
                  value={form.approvalDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, approvalDate: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            </div>
          </fieldset>

          <FormDialogFooter
            mode={mode}
            saving={saving}
            onClose={onClose}
          />
        </form>
      </div>
    </div>
  );
}
