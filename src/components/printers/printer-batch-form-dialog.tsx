"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
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
import { emptyPrinterForm, type PrinterFormValues } from "@/lib/printer-form";
import { buildSerialRange } from "@/lib/serial-range";

export type PrinterBatchSubmitPayload = {
  serials: string[];
  base: Omit<PrinterFormValues, "fiscalSerial">;
};

type PrinterBatchFormDialogProps = {
  open: boolean;
  saving: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  modelOptions: SelectOption[];
  modelsLoading: boolean;
  lockDistributor: boolean;
  defaultDistributorId?: number | null;
  onClose: () => void;
  onSubmit: (payload: PrinterBatchSubmitPayload) => void;
};

export function PrinterBatchFormDialog({
  open,
  saving,
  progress,
  error,
  modelOptions,
  modelsLoading,
  lockDistributor,
  defaultDistributorId,
  onClose,
  onSubmit,
}: PrinterBatchFormDialogProps) {
  type WizardStep = 1 | 2;
  const [range, setRange] = useState<SerialRangeFormValues>(emptySerialRangeForm());
  const [form, setForm] = useState<Omit<PrinterFormValues, "fiscalSerial">>(
    emptyPrinterForm(),
  );
  const [step, setStep] = useState<WizardStep>(1);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const distributorDefault =
      defaultDistributorId != null ? String(defaultDistributorId) : "";
    setRange(emptySerialRangeForm());
    setForm(
      emptyPrinterForm({
        distributorId: lockDistributor ? distributorDefault : "",
      }),
    );
    setStep(1);
    setStepError(null);
  }, [open, lockDistributor, defaultDistributorId]);

  const disabled = saving || modelsLoading;
  const busy = saving;
  const displayError = stepError ?? error;

  function validateRange(): string | null {
    const serials = buildSerialRange(range, { mode: "fiscal" });
    if (typeof serials === "string") return serials;
    if (serials.length === 0) return "El rango no genera seriales válidos.";
    return null;
  }

  function validateCommonData(): string | null {
    const modelId = Number(form.modelId);
    if (!Number.isFinite(modelId) || modelId <= 0) {
      return "Selecciona un modelo fiscal válido.";
    }
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

    const serials = buildSerialRange(range, { mode: "fiscal" });
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
      title="Crear impresoras por lote"
      description={
        step === 1
          ? "Paso 1 de 2 · Define el rango de seriales a generar."
          : "Paso 2 de 2 · Define los datos comunes para el lote."
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
          mode="fiscal"
          values={range}
          onChange={setRange}
          disabled={disabled}
        />
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-card-foreground">
            Datos comunes
          </h3>
          <label className="block">
            <FieldLabel required>Modelo fiscal</FieldLabel>
            {modelOptions.length > 0 ? (
              <select
                required
                value={form.modelId}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, modelId: e.target.value }))
                }
                className={BATCH_FORM_INPUT_CLASS}
              >
                <option value="">Seleccionar...</option>
                {modelOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                required
                min={1}
                value={form.modelId}
                disabled={disabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, modelId: e.target.value }))
                }
                className={BATCH_FORM_INPUT_CLASS}
                placeholder="ID del modelo"
              />
            )}
          </label>
        </div>
      )}
    </BatchFormDialog>
  );
}
