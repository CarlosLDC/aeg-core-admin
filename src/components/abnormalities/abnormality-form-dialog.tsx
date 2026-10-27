"use client";

import { type FormEvent, useId, useState } from "react";
import { Loader2, X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooterBar } from "@/components/ui/form-dialog-footer";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  ABNORMALITY_TYPE_LABELS,
  EMPTY_ABNORMALITY_FORM,
  isAbnormalityType,
  type AbnormalityFormValues,
} from "@/lib/abnormalities";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { ABNORMALITY_TYPES } from "@/types/abnormality";

type AbnormalityFormDialogProps = {
  saving: boolean;
  error: string | null;
  catalogLoading: boolean;
  printerOptions: SearchableSelectOption[];
  onClose: () => void;
  onSubmit: (values: AbnormalityFormValues) => void;
};

export function AbnormalityFormDialog({
  saving,
  error,
  catalogLoading,
  printerOptions,
  onClose,
  onSubmit,
}: AbnormalityFormDialogProps) {
  const titleId = useId();
  const [form, setForm] = useState<AbnormalityFormValues>(
    EMPTY_ABNORMALITY_FORM,
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        disabled={saving}
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="shrink-0 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id={titleId}
                className="text-lg font-semibold text-card-foreground"
              >
                Registrar anormalidad
              </h2>
              <p className="mt-1 text-sm text-muted">
                Libro de control de anormalidades (Art. 46 g e i SENIAT).
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md p-1 text-muted hover:bg-foreground/5 disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <div>
              <FieldLabel required>Impresora fiscal</FieldLabel>
              <SearchableSelect
                options={printerOptions}
                value={form.printerId}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, printerId: value }))
                }
                loading={catalogLoading}
                emptyLabel="Selecciona una impresora"
                modalTitle="Seleccionar impresora"
                disabled={saving || catalogLoading}
                preloadOptions
              />
            </div>

            <label className="block space-y-1 text-sm">
              <FieldLabel required>Tipo de anormalidad</FieldLabel>
              <select
                className={formFieldInputClass}
                value={form.type}
                disabled={saving}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isAbnormalityType(val)) {
                    setForm((prev) => ({ ...prev, type: val }));
                  }
                }}
              >
                {ABNORMALITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ABNORMALITY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-card-foreground">
                Fecha de detección (opcional)
              </span>
              <input
                type="date"
                className={formFieldInputClass}
                value={form.detectedDate}
                disabled={saving}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, detectedDate: e.target.value }))
                }
              />
              <span className="text-xs text-muted">
                Si la dejas vacía se registra con la fecha y hora actual.
              </span>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.authorized}
                disabled={saving}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    authorized: e.target.checked,
                  }))
                }
              />
              <span className="text-card-foreground">
                Intervención realizada por personal autorizado
              </span>
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium text-card-foreground">
                Descripción (opcional)
              </span>
              <textarea
                className={`${formFieldInputClass} min-h-24 py-2`}
                value={form.description}
                disabled={saving}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </label>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-border px-4 py-4 sm:px-5">
            <FormDialogFooterBar>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Registrar
                </button>
              </div>
            </FormDialogFooterBar>
          </div>
        </form>
      </div>
    </div>
  );
}
