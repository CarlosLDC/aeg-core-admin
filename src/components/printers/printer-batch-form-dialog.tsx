"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import {
  Cpu,
  Layers,
  Link2,
  Loader2,
  Printer,
} from "lucide-react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import {
  PrinterWizardFields,
  type PrinterWizardSection,
} from "@/components/printers/printer-wizard-fields";
import {
  BatchFormDialog,
  type BatchWizardStep,
} from "@/components/ui/batch-form-dialog";
import {
  emptySerialRangeForm,
  SerialRangeFields,
  type SerialRangeFormValues,
} from "@/components/ui/serial-range-fields";
import {
  emptyPrinterForm,
  type PrinterFormValues,
} from "@/lib/printer-form";
import {
  validatePrinterWizardSection,
} from "@/lib/printer-onboarding-policy";
import { printerFormSchema } from "@/lib/schemas/printer-form-schema";
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
  softwareOptions: SelectOption[];
  clientOptions: SelectOption[];
  distributorOptions: SelectOption[];
  modelsLoading: boolean;
  catalogLoading: boolean;
  canPickSoftware: boolean;
  lockDistributor: boolean;
  defaultDistributorId?: number | null;
  onClose: () => void;
  onSubmit: (payload: PrinterBatchSubmitPayload) => void;
};

type BatchWizardStepIndex = 1 | 2 | 3 | 4;

const WIZARD_STEPS: (BatchWizardStep & {
  step: BatchWizardStepIndex;
  section?: PrinterWizardSection;
})[] = [
  {
    step: 1,
    section: "equipment",
    label: "Equipo",
    icon: Printer,
    subtitle: "Modelo fiscal y estatus comunes para todo el lote.",
  },
  {
    step: 2,
    label: "Rango",
    icon: Layers,
    subtitle: "Define el rango de seriales fiscales a generar.",
  },
  {
    step: 3,
    section: "assignment",
    label: "Asignación",
    icon: Link2,
    subtitle: "Distribuidor, cliente y software asociados.",
  },
  {
    step: 4,
    section: "technical",
    label: "Detalles",
    icon: Cpu,
    subtitle: "Enajenación, firmware y dirección MAC.",
  },
];

export function PrinterBatchFormDialog({
  open,
  saving,
  progress,
  error,
  modelOptions,
  softwareOptions,
  clientOptions,
  distributorOptions,
  modelsLoading,
  catalogLoading,
  canPickSoftware,
  lockDistributor,
  defaultDistributorId,
  onClose,
  onSubmit,
}: PrinterBatchFormDialogProps) {
  const formId = useId();
  const [range, setRange] = useState<SerialRangeFormValues>(emptySerialRangeForm());
  const [form, setForm] = useState<PrinterFormValues>(emptyPrinterForm());
  const [step, setStep] = useState<BatchWizardStepIndex>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof PrinterFormValues, string>>
  >({});

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
    setFieldErrors({});
  }, [open, lockDistributor, defaultDistributorId]);

  const disabled = saving || modelsLoading || catalogLoading;
  const busy = saving;
  const displayError = stepError ?? error;
  const lastStep = WIZARD_STEPS.length;
  const current = WIZARD_STEPS.find((s) => s.step === step)!;
  const selectedModelPrefix = useMemo(
    () =>
      modelOptions.find((opt) => String(opt.id) === form.modelId)
        ?.serialPrefix ?? null,
    [modelOptions, form.modelId],
  );
  const effectiveRange = useMemo<SerialRangeFormValues>(
    () => ({
      ...range,
      prefix: selectedModelPrefix || range.prefix,
    }),
    [range, selectedModelPrefix],
  );

  function goToStep(target: BatchWizardStepIndex) {
    setStepError(null);
    setStep(target);
  }

  function goNext() {
    setStepError(null);
    if (step < lastStep) {
      setStep((step + 1) as BatchWizardStepIndex);
    }
  }

  function goBack() {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1) as BatchWizardStepIndex);
  }

  function validateRange(): string | null {
    const serials = buildSerialRange(effectiveRange, { mode: "fiscal" });
    if (typeof serials === "string") return serials;
    if (serials.length === 0) return "El rango no genera seriales válidos.";
    return null;
  }

  function submitBatch() {
    for (const { section } of WIZARD_STEPS) {
      if (!section) continue;
      const err = validatePrinterWizardSection(section, form, {
        omitFiscalSerial: true,
      });
      if (err) {
        setStepError(err);
        const failed = WIZARD_STEPS.find((s) => s.section === section);
        if (failed) setStep(failed.step);
        return;
      }
    }

    const rangeError = validateRange();
    if (rangeError) {
      setStepError(rangeError);
      setStep(2);
      return;
    }

    const parsed = printerFormSchema.safeParse({ ...form, fiscalSerial: "" });
    if (!parsed.success) {
      const nextFieldErrors: Partial<Record<keyof PrinterFormValues, string>> =
        {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !(key in nextFieldErrors)) {
          nextFieldErrors[key as keyof PrinterFormValues] = issue.message;
        }
      }
      setFieldErrors(nextFieldErrors);
      setStepError(
        parsed.error.issues[0]?.message ?? "Revisa los datos del formulario.",
      );
      const firstKey = parsed.error.issues[0]?.path[0];
      if (
        firstKey === "modelId" ||
        firstKey === "status" ||
        firstKey === "paid"
      ) {
        setStep(1);
      } else if (
        firstKey === "distributorId" ||
        firstKey === "clientId" ||
        firstKey === "softwareId"
      ) {
        setStep(3);
      } else {
        setStep(4);
      }
      return;
    }

    const serials = buildSerialRange(effectiveRange, { mode: "fiscal" });
    if (typeof serials === "string") {
      setStepError(serials);
      setStep(2);
      return;
    }

    setFieldErrors({});
    setStepError(null);
    const { fiscalSerial: _serial, ...base } = {
      ...form,
      versionFirmware: form.versionFirmware.trim(),
      macAddress: form.macAddress.trim().toUpperCase(),
    };
    onSubmit({ serials, base });
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
      title="Crear impresoras por lote"
      steps={WIZARD_STEPS}
      activeStep={step}
      onStepChange={(target) => goToStep(target as BatchWizardStepIndex)}
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
      {step === 2 ? (
        <SerialRangeFields
          mode="fiscal"
          values={range}
          fixedPrefix={selectedModelPrefix}
          onChange={setRange}
          disabled={disabled}
        />
      ) : current.section ? (
        <PrinterWizardFields
          section={current.section}
          form={form}
          setForm={setForm}
          saving={saving}
          modelsLoading={modelsLoading}
          catalogLoading={catalogLoading}
          modelOptions={modelOptions}
          distributorOptions={distributorOptions}
          clientOptions={clientOptions}
          softwareOptions={softwareOptions}
          canPickSoftware={canPickSoftware}
          lockDistributor={lockDistributor}
          fieldErrors={fieldErrors}
          omitFiscalSerial
        />
      ) : null}
    </BatchFormDialog>
  );
}
