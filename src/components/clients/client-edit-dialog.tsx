"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Loader2, MapPin, Phone, X } from "lucide-react";
import {
  ClientFormFields,
  type ClientFormSection,
} from "@/components/clients/client-form-fields";
import type { ClientOnboardingValues } from "@/lib/client-onboarding";
import { validateOnboardingSection } from "@/lib/distributor-onboarding-policy";
import { normalizeStateName } from "@/lib/state-label";
import { formatVenezuelanPhone } from "@/lib/venezuelan-phone";
import type { BranchResponse } from "@/types/branch";
import { type CompanyResponse, type ContributorType } from "@/types/company";
import { FormDialogFooterBar } from "@/components/ui/form-dialog-footer";
import { cn } from "@/lib/utils";

export type ClientEditValues = {
  businessName: string;
  rif: string;
  contributorType: ContributorType;
  city: string;
  state: string;
  address: string;
  contactPersonName: string;
  phone: string;
  email: string;
};

type ClientEditDialogProps = {
  open: boolean;
  saving: boolean;
  error: string | null;
  company: CompanyResponse;
  branch: BranchResponse;
  onClose: () => void;
  onSubmit: (values: ClientEditValues) => void;
};

type WizardStep = 1 | 2 | 3;

const FORM_STEPS: {
  step: WizardStep;
  section: ClientFormSection;
  label: string;
}[] = [
  { step: 1, section: "fiscal", label: "Empresa" },
  { step: 2, section: "location", label: "Ubicación" },
  { step: 3, section: "contact", label: "Contacto" },
];

const STEP_ICONS = {
  1: Building2,
  2: MapPin,
  3: Phone,
} as const;

const emptyForm: ClientOnboardingValues = {
  rif: "",
  businessName: "",
  contributorType: "ordinario",
  linkedCompanyId: null,
  city: "",
  state: "",
  address: "",
  contactPersonName: "",
  phone: "",
  email: "",
};

function stepSubtitle(step: WizardStep): string {
  switch (step) {
    case 1:
      return "Razón social, RIF y tipo de contribuyente.";
    case 2:
      return "Estado, ciudad y dirección de la empresa cliente.";
    case 3:
      return "Persona de contacto y canales de comunicación.";
    default:
      return "";
  }
}

export function ClientEditDialog({
  open,
  saving,
  error,
  company,
  branch,
  onClose,
  onSubmit,
}: ClientEditDialogProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<ClientOnboardingValues>(emptyForm);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setStepError(null);
    setForm({
      rif: company.rif ?? "",
      businessName: company.businessName ?? "",
      contributorType: company.contributorType,
      linkedCompanyId: null,
      city: branch.city ?? "",
      state: branch.state ?? "",
      address: branch.address ?? "",
      contactPersonName: branch.contactPersonName ?? "",
      phone: branch.phone ?? "",
      email: branch.email ?? "",
    });
  }, [open, company, branch]);

  const currentStep = useMemo(
    () => FORM_STEPS.find((s) => s.step === step),
    [step],
  );

  if (!open || !currentStep) return null;
  const currentSection = currentStep.section;

  function goToStep(target: WizardStep) {
    setStepError(null);
    setStep(target);
  }

  function goNext() {
    setStepError(null);
    setStep((s) => Math.min(3, s + 1) as WizardStep);
  }

  function goBack() {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1) as WizardStep);
  }

  function validateSection(section: ClientFormSection): string | null {
    return validateOnboardingSection(section, form);
  }

  function submitRegistration() {
    for (const { section } of FORM_STEPS) {
      const sectionError = validateSection(section);
      if (sectionError) {
        setStepError(sectionError);
        const failed = FORM_STEPS.find((s) => s.section === section);
        if (failed) setStep(failed.step);
        return;
      }
    }

    setStepError(null);
    onSubmit({
      businessName: form.businessName.trim(),
      rif: form.rif.trim().toUpperCase(),
      contributorType: form.contributorType,
      city: form.city.trim(),
      state: normalizeStateName(form.state),
      address: form.address.trim(),
      contactPersonName: form.contactPersonName.trim(),
      phone: formatVenezuelanPhone(form.phone) || form.phone.trim(),
      email: form.email.trim(),
    });
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    const sectionError = validateSection(currentSection);
    if (sectionError) {
      setStepError(sectionError);
      return;
    }
    if (step < 3) {
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
      aria-labelledby="client-edit-wizard-title"
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
                id="client-edit-wizard-title"
                className="text-lg font-semibold text-card-foreground"
              >
                Editar cliente
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
            id="client-edit-wizard-form"
            onSubmit={handleFormSubmit}
            className="flex h-full flex-col"
          >
            {displayError ? (
              <p
                role="alert"
                className="mb-4 shrink-0 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {displayError}
              </p>
            ) : null}

            <ClientFormFields
              form={form}
              setForm={setForm}
              saving={saving}
              linkedCompany={undefined}
              inputMode="manual"
              aiFields={new Set()}
              section={currentSection}
            />
          </form>
        </div>

        <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
          <FormDialogFooterBar>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between [&_button]:w-full sm:[&_button]:w-auto">
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
            {step < 3 ? (
              <button
                type="submit"
                form="client-edit-wizard-form"
                disabled={saving}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="submit"
                form="client-edit-wizard-form"
                disabled={saving}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                  saving && "cursor-not-allowed opacity-70",
                )}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Guardar cambios
              </button>
            )}
          </div>
            </div>
          </FormDialogFooterBar>
        </div>
      </div>
    </div>
  );
}
