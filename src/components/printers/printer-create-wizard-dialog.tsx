"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { Cpu, Link2, Loader2, Printer, Settings2, X } from "lucide-react";
import {
  PrinterWizardFields,
  type PrinterWizardSection,
} from "@/components/printers/printer-wizard-fields";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import {
  emptyPrinterForm,
  type PrinterFormValues,
} from "@/lib/printer-form";
import { validatePrinterWizardSection } from "@/lib/printer-onboarding-policy";
import { printerFormSchema } from "@/lib/schemas/printer-form-schema";
import { cn } from "@/lib/utils";

type PrinterCreateWizardDialogProps = {
  open: boolean;
  saving: boolean;
  error: string | null;
  modelOptions: SelectOption[];
  softwareOptions: SelectOption[];
  clientOptions: SelectOption[];
  distributorOptions: SelectOption[];
  modelsLoading: boolean;
  catalogLoading: boolean;
  canPickSoftware: boolean;
  lockDistributor: boolean;
  defaultDistributorId: number | null;
  onClose: () => void;
  onSubmit: (values: PrinterFormValues) => void;
};

type WizardStep = 1 | 2 | 3 | 4;

const FORM_STEPS: {
  step: WizardStep;
  section: PrinterWizardSection;
  label: string;
}[] = [
  { step: 1, section: "equipment", label: "Equipo" },
  { step: 2, section: "operation", label: "Estado" },
  { step: 3, section: "assignment", label: "Asignación" },
  { step: 4, section: "technical", label: "Detalles" },
];

const STEP_ICONS = {
  1: Printer,
  2: Settings2,
  3: Link2,
  4: Cpu,
} as const;

function stepSubtitle(step: WizardStep): string {
  switch (step) {
    case 1:
      return "Modelo fiscal y serial de la impresora.";
    case 2:
      return "Estatus, tipo de dispositivo y condiciones de venta.";
    case 3:
      return "Distribuidor, cliente y software asociados.";
    case 4:
      return "Instalación, firmware y dirección MAC.";
    default:
      return "";
  }
}

export function PrinterCreateWizardDialog({
  open,
  saving,
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
}: PrinterCreateWizardDialogProps) {
  const formId = useId();
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<PrinterFormValues>(emptyPrinterForm);
  const [stepError, setStepError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof PrinterFormValues, string>>
  >({});

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setStepError(null);
    setFieldErrors({});
    setForm({
      ...emptyPrinterForm(),
      distributorId:
        lockDistributor && defaultDistributorId != null
          ? String(defaultDistributorId)
          : "",
    });
  }, [open, lockDistributor, defaultDistributorId]);

  if (!open) return null;

  const currentStep = FORM_STEPS.find((s) => s.step === step)!;

  function goToStep(target: WizardStep) {
    setStepError(null);
    setStep(target);
  }

  function goNext() {
    setStepError(null);
    if (step < 4) {
      setStep((step + 1) as WizardStep);
    }
  }

  function goBack() {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1) as WizardStep);
  }

  function submitRegistration() {
    for (const { section } of FORM_STEPS) {
      const err = validatePrinterWizardSection(section, form);
      if (err) {
        setStepError(err);
        const failed = FORM_STEPS.find((s) => s.section === section);
        if (failed) setStep(failed.step);
        return;
      }
    }

    const parsed = printerFormSchema.safeParse(form);
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
      setStepError(parsed.error.issues[0]?.message ?? "Revisa los datos del formulario.");
      const firstKey = parsed.error.issues[0]?.path[0];
      if (firstKey === "modelId" || firstKey === "fiscalSerial") setStep(1);
      else if (
        firstKey === "status" ||
        firstKey === "deviceType" ||
        firstKey === "finalSalePrice" ||
        firstKey === "paid"
      ) {
        setStep(2);
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

    setFieldErrors({});
    setStepError(null);
    onSubmit({
      ...form,
      fiscalSerial: form.fiscalSerial.trim().toUpperCase(),
      versionFirmware: form.versionFirmware.trim(),
      macAddress: form.macAddress.trim().toUpperCase(),
      finalSalePrice: form.finalSalePrice.trim(),
    });
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < 4) {
      goNext();
      return;
    }
    submitRegistration();
  }

  const displayError = stepError ?? error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="printer-create-wizard-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="printer-create-wizard-title"
                className="text-lg font-semibold text-card-foreground"
              >
                Nueva impresora
              </h2>
              <p className="mt-1 text-sm text-muted">{stepSubtitle(step)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="mt-4 flex gap-1" aria-label="Pasos del registro">
            {FORM_STEPS.map(({ step: s, label }) => {
              const Icon = STEP_ICONS[s];
              const isActive = step === s;
              const isDone = step > s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={saving}
                  onClick={() => goToStep(s)}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition-colors",
                    "hover:bg-foreground/5 disabled:opacity-50",
                    isActive && "bg-accent/10 text-accent",
                    isDone && !isActive && "text-card-foreground",
                    !isActive && !isDone && "text-muted",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="text-[11px] font-medium leading-tight sm:text-xs">
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <form
            id={formId}
            onSubmit={handleFormSubmit}
            className="flex h-full flex-col"
          >
            {displayError && (
              <p
                role="alert"
                className="mb-4 shrink-0 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {displayError}
              </p>
            )}

            <PrinterWizardFields
              section={currentStep.section}
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
            />
          </form>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border px-4 py-4 sm:flex-row sm:justify-between sm:px-6 [&_button]:w-full sm:[&_button]:w-auto">
          <button
            type="button"
            onClick={goBack}
            disabled={saving || step === 1}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
          >
            Atrás
          </button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5"
            >
              Cancelar
            </button>
            {step < 4 ? (
              <button
                type="submit"
                form={formId}
                disabled={saving}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="submit"
                form={formId}
                disabled={saving}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                  saving && "cursor-not-allowed opacity-70",
                )}
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Crear impresora
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
