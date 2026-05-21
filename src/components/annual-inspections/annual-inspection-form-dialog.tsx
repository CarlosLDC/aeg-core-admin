"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { PhotoDocumentUpload } from "@/components/ui/photo-document-upload";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import {
  annualInspectionToFormValues,
  emptyAnnualInspectionForm,
  type AnnualInspectionFormValues,
} from "@/lib/annual-inspection-form";
import type { AnnualInspectionResponse } from "@/types/annual-inspection";
import { cn } from "@/lib/utils";

type AnnualInspectionFormDialogProps = {
  mode: "create" | "edit";
  row?: AnnualInspectionResponse;
  open: boolean;
  saving: boolean;
  error: string | null;
  catalogLoading: boolean;
  canLoadPrinters: boolean;
  printerOptions: SearchableSelectOption[];
  employeeOptions: SearchableSelectOption[];
  onClose: () => void;
  onSubmit: (values: AnnualInspectionFormValues) => void;
  onDelete?: () => void;
  deleting?: boolean;
};

export function AnnualInspectionFormDialog({
  mode,
  row,
  open,
  saving,
  error,
  catalogLoading,
  canLoadPrinters,
  printerOptions,
  employeeOptions,
  onClose,
  onSubmit,
  onDelete,
  deleting = false,
}: AnnualInspectionFormDialogProps) {
  const [form, setForm] = useState<AnnualInspectionFormValues>(
    emptyAnnualInspectionForm(),
  );

  useEffect(() => {
    if (!open) return;
    setForm(
      mode === "edit" && row
        ? annualInspectionToFormValues(row)
        : emptyAnnualInspectionForm(),
    );
  }, [open, mode, row]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";
  const disabled = saving || catalogLoading;

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
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {mode === "create"
                ? "Nueva inspección anual"
                : "Editar inspección anual"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Documenta la revisión anual con datos técnicos y evidencia.
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Asignación
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-sm font-medium">Impresora</span>
                {canLoadPrinters && printerOptions.length > 0 ? (
                  <SearchableSelect
                    value={form.printerId}
                    onChange={(printerId) =>
                      setForm((f) => ({ ...f, printerId }))
                    }
                    options={printerOptions}
                    disabled={disabled}
                    loading={catalogLoading}
                    required
                    mono
                    searchPlaceholder="Buscar por serial…"
                  />
                ) : (
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.printerId}
                    disabled={disabled}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, printerId: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="ID de impresora"
                  />
                )}
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium">Empleado</span>
                <SearchableSelect
                  value={form.employeeId}
                  onChange={(employeeId) =>
                    setForm((f) => ({ ...f, employeeId }))
                  }
                  options={employeeOptions}
                  disabled={disabled}
                  loading={catalogLoading}
                  required
                  searchPlaceholder="Buscar empleado…"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Resultado de inspección
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Fecha de inspección
                </span>
                <input
                  type="date"
                  value={form.inspectionDate}
                  disabled={disabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, inspectionDate: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2">
                <input
                  type="checkbox"
                  checked={form.sealTampered}
                  disabled={disabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sealTampered: e.target.checked }))
                  }
                  className="size-4 rounded border-border"
                />
                <span className="text-sm font-medium">Precinto violentado</span>
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Observaciones
              </span>
              <textarea
                rows={3}
                value={form.notes}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                className={inputClass}
              />
            </label>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Evidencia
            </legend>
            <div className="block">
              <span className="mb-1.5 block text-sm font-medium">Fotos</span>
              <PhotoDocumentUpload
                folder="annual-inspections"
                urls={form.photoUrls}
                onChange={(photoUrls) => setForm((f) => ({ ...f, photoUrls }))}
                disabled={disabled}
                ariaLabel="Subir fotos de la inspección anual"
                addLabel="Añadir fotos"
                requiredHint="Se requiere al menos una foto."
              />
            </div>
          </fieldset>

          <FormDialogFooter
            mode={mode}
            saving={saving}
            deleting={deleting}
            submitDisabled={catalogLoading || form.photoUrls.length === 0}
            onClose={onClose}
            onDelete={onDelete}
          />
        </form>
      </div>
    </div>
  );
}
