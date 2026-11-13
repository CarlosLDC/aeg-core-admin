"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { Package, X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import {
  emptyInventoryBoxForm,
  inventoryBoxToFormValues,
  type InventoryBoxFormValues,
} from "@/lib/inventory-box-form";
import { inventoryBoxFormSchema } from "@/lib/schemas/inventory-box-form-schema";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import type { InventoryBoxResponse } from "@/types/inventory-box";

type InventoryBoxFormDialogProps = {
  mode: "create" | "edit";
  box?: InventoryBoxResponse;
  suggestedBoxNumber?: number;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: InventoryBoxFormValues) => void;
};

export function InventoryBoxFormDialog({
  mode,
  box,
  suggestedBoxNumber,
  open,
  saving,
  error,
  onClose,
  onSubmit,
}: InventoryBoxFormDialogProps) {
  const formId = useId();
  const [form, setForm] = useState<InventoryBoxFormValues>(() =>
    emptyInventoryBoxForm(suggestedBoxNumber),
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof InventoryBoxFormValues, string>>
  >({});

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && box) {
      setForm(inventoryBoxToFormValues(box));
    } else {
      setForm(emptyInventoryBoxForm(suggestedBoxNumber));
    }
    setFieldErrors({});
  }, [open, mode, box, suggestedBoxNumber]);

  if (!open) return null;

  function handleFormSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = inventoryBoxFormSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof InventoryBoxFormValues, string>> =
        {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof InventoryBoxFormValues | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    onSubmit(form);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Package className="size-4.5" />
            </div>
            <div>
              <h2
                id={`${formId}-title`}
                className="text-base font-semibold text-card-foreground"
              >
                {mode === "create"
                  ? "Nueva caja de inventario"
                  : `Editar Caja ${box?.boxNumber ?? ""}`}
              </h2>
              <p className="text-xs text-muted">
                Número correlativo y observaciones de empaque.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar diálogo"
            className="rounded-lg p-1.5 text-muted hover:bg-foreground/5 hover:text-card-foreground disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          id={formId}
          onSubmit={handleFormSubmit}
          className="space-y-4 overflow-y-auto px-5 py-4"
        >
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
            >
              {error}
            </p>
          )}

          <label className="block">
            <FieldLabel required>Número de caja</FieldLabel>
            <input
              type="number"
              min={1}
              step={1}
              required
              disabled={saving}
              value={form.boxNumber}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, boxNumber: event.target.value }));
                setFieldErrors((prev) => ({ ...prev, boxNumber: undefined }));
              }}
              className={cn(formFieldInputClass, "font-mono")}
              placeholder="84"
            />
            {fieldErrors.boxNumber ? (
              <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                {fieldErrors.boxNumber}
              </span>
            ) : null}
          </label>

          <label className="block">
            <FieldLabel>Observaciones</FieldLabel>
            <textarea
              rows={3}
              maxLength={255}
              disabled={saving}
              value={form.observations}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  observations: event.target.value,
                }));
                setFieldErrors((prev) => ({
                  ...prev,
                  observations: undefined,
                }));
              }}
              className={cn(formFieldInputClass, "h-auto py-2.5")}
              placeholder="Ubicación física, lote o notas de inventario (opcional)"
            />
            {fieldErrors.observations ? (
              <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                {fieldErrors.observations}
              </span>
            ) : null}
          </label>
        </form>

        <div className="shrink-0 border-t border-border bg-foreground/[0.02] px-5 py-3.5">
          <FormDialogFooter
            mode={mode}
            saving={saving}
            onClose={onClose}
            formId={formId}
            createLabel="Crear caja"
            saveLabel="Guardar cambios"
          />
        </div>
      </div>
    </div>
  );
}
