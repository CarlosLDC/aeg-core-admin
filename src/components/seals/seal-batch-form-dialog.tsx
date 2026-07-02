"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { Layers, Loader2, Stamp } from "lucide-react";
import {
  BatchFormDialog,
  BATCH_FORM_INPUT_CLASS,
  type BatchWizardStep,
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

type WizardStep = 1 | 2;

const WIZARD_STEPS: (BatchWizardStep & { step: WizardStep })[] = [
  {
    step: 1,
    label: "Rango",
    icon: Layers,
    subtitle: "Define el rango de seriales del lote.",
  },
  {
    step: 2,
    label: "Datos",
    icon: Stamp,
    subtitle: "Color y estatus comunes para todos los precintos.",
  },
];

export function SealBatchFormDialog({
  open,
  saving,
  progress,
  error,
  onClose,
  onSubmit,
}: SealBatchFormDialogProps) {
  const formId = useId();
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
  const lastStep = WIZARD_STEPS.length;

  function goToStep(target: WizardStep) {
    setStepError(null);
    setStep(target);
  }

  function goNext() {
    setStepError(null);
    if (step < lastStep) {
      setStep((step + 1) as WizardStep);
    }
  }

  function goBack() {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1) as WizardStep);
  }

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

  function submitBatch() {
    const rangeError = validateRange();
    if (rangeError) {
      setStepError(rangeError);
      setStep(1);
      return;
    }

    const commonError = validateCommonData();
    if (commonError) {
      setStepError(commonError);
      setStep(2);
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < lastStep) {
      goNext();
      return;
    }
    submitBatch();
  }

  return (
    <BatchFormDialog
      open={open}
      title="Crear precintos por lote"
      steps={WIZARD_STEPS}
      activeStep={step}
      onStepChange={(target) => goToStep(target as WizardStep)}
      error={displayError}
      progress={progress}
      busy={busy}
      submitDisabled={disabled}
      formId={formId}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between [&_button]:w-full sm:[&_button]:w-auto">
          <button
            type="button"
            onClick={goBack}
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
            {step < lastStep ? (
              <button
                type="submit"
                form={formId}
                disabled={busy}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="submit"
                form={formId}
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
        <fieldset className="space-y-4" disabled={disabled}>
          <legend className="sr-only">Datos comunes del lote</legend>
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
        </fieldset>
      )}
    </BatchFormDialog>
  );
}
