"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  BatchFormDialog,
  BATCH_FORM_INPUT_CLASS,
} from "@/components/ui/batch-form-dialog";
import { FieldLabel } from "@/components/ui/field-label";
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

export type SealBatchSubmitPayload = {
  serials: string[];
  base: Omit<SealFormValues, "serial">;
};

type SealBatchFormDialogProps = {
  open: boolean;
  saving: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: SealBatchSubmitPayload) => void;
};

export function SealBatchFormDialog({
  open,
  saving,
  progress,
  error,
  onClose,
  onSubmit,
}: SealBatchFormDialogProps) {
  type WizardStep = 1 | 2;
  const [range, setRange] = useState<SerialRangeFormValues>(emptySerialRangeForm());
  const [form, setForm] = useState<Omit<SealFormValues, "serial">>(emptySealForm());
  const [step, setStep] = useState<WizardStep>(1);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRange(emptySerialRangeForm());
    setForm(emptySealForm());
    setStep(1);
    setStepError(null);
  }, [open]);

  const disabled = saving;
  const busy = saving;
  const displayError = stepError ?? error;

  function validateRange(): string | null {
    const serials = buildSerialRange(range, { mode: "seal" });
    if (typeof serials === "string") return serials;
    if (serials.length === 0) return "El rango no genera seriales válidos.";
    return null;
  }

  function validateCommonData(): string | null {
    if (!SEAL_COLORS.includes(form.color)) return "Color no válido.";
    if (!SEAL_STATUSES.includes(form.status)) return "Estatus no válido.";
    return null;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === 1) {
      const rangeError = validateRange();
      if (rangeError) {
        setStepError(rangeError);
        return;
      }
      setStepError(null);
      setStep(2);
      return;
    }

    const commonError = validateCommonData();
    if (commonError) {
      setStepError(commonError);
      return;
    }

    const serials = buildSerialRange(range, { mode: "seal" });
    if (typeof serials === "string") {
      setStepError(serials);
      setStep(1);
      return;
    }
    setStepError(null);
    onSubmit({ serials, base: form });
  }

  return (
    <BatchFormDialog
      open={open}
      title="Crear precintos por lote"
      description={
        step === 1
          ? "Paso 1 de 2 · Define el rango de seriales del lote."
          : "Paso 2 de 2 · Define color y estatus por defecto."
      }
      error={displayError}
      progress={progress}
      busy={busy}
      submitDisabled={disabled}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between [&_button]:w-full sm:[&_button]:w-auto">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1) as WizardStep)}
            disabled={busy || step === 1}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
          >
            Atrás
          </button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
            >
              Cancelar
            </button>
            {step === 1 ? (
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="submit"
                disabled={busy || disabled}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-70"
              >
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Crear lote
              </button>
            )}
          </div>
        </div>
      }
    >
      {step === 1 ? (
        <SerialRangeFields
          mode="seal"
          values={range}
          onChange={setRange}
          disabled={disabled}
        />
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-card-foreground">
            Datos comunes
          </h3>
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
                className={BATCH_FORM_INPUT_CLASS}
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
                className={BATCH_FORM_INPUT_CLASS}
              >
                {SEAL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SEAL_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </BatchFormDialog>
  );
}
