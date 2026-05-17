"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { PrinterModelFormValues } from "@/lib/printer-model-form";
import type { PrinterModelResponse } from "@/types/printer-model";
import { cn } from "@/lib/utils";

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
  providencia: "",
  approvalDate: "",
  price: "",
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
        providencia: model.providencia ?? "",
        approvalDate: toDateInputValue(model.approvalDate),
        price: String(model.price),
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
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Marca</span>
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
              <span className="mb-1.5 block text-sm font-medium">
                Código de modelo
              </span>
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
            <span className="mb-1.5 block text-sm font-medium">Providencia</span>
            <input
              type="text"
              value={form.providencia}
              onChange={(e) =>
                setForm((f) => ({ ...f, providencia: e.target.value }))
              }
              className={inputClass}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Fecha de aprobación
              </span>
              <input
                type="date"
                value={form.approvalDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, approvalDate: e.target.value }))
                }
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Precio</span>
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
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn(
                "flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                saving && "cursor-not-allowed opacity-70",
              )}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {mode === "create" ? "Crear" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
