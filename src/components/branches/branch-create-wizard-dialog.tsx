"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Loader2, MapPin, Phone, Tags, X } from "lucide-react";
import { HeadquartersSelectorFields } from "@/components/branches/headquarters-selector-fields";
import { BranchWizardRolesFields } from "@/components/branches/branch-wizard-roles-fields";
import {
  emptyBranchWizardForm,
  type BranchWizardValues,
} from "@/components/branches/branch-wizard-types";
import {
  ClientFormFields,
  type ClientFormSection,
} from "@/components/clients/client-form-fields";
import { SeniatDocumentScan } from "@/components/seniat/seniat-document-scan";
import {
  collectAiFilledFields,
  type SeniatLockableField,
} from "@/lib/seniat-ai-fields";
import {
  findCompanyByRif,
  type SeniatExtractResult,
} from "@/lib/seniat-extract";
import {
  validateOnboardingSection,
  type OnboardingStepSection,
} from "@/lib/distributor-onboarding-policy";
import type { ClientOnboardingValues } from "@/lib/client-onboarding";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import { cn } from "@/lib/utils";

export type { BranchWizardValues } from "@/components/branches/branch-wizard-types";

type BranchCreateWizardDialogProps = {
  open: boolean;
  saving: boolean;
  error: string | null;
  resumeCompanyId?: number | null;
  companies: CompanyResponse[];
  branches: BranchResponse[];
  distributors: DistributorResponse[];
  companiesLoading: boolean;
  onClose: () => void;
  onSubmit: (values: BranchWizardValues) => void;
};

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

const FORM_STEPS: {
  step: 1 | 2 | 3 | 4 | 5;
  section: ClientFormSection | "headquarters" | "roles";
  label: string;
}[] = [
  { step: 1, section: "fiscal", label: "Fiscal" },
  { step: 2, section: "location", label: "Ubicación" },
  { step: 3, section: "contact", label: "Contacto" },
  { step: 4, section: "headquarters", label: "Casa matriz" },
  { step: 5, section: "roles", label: "Roles" },
];

const STEP_ICONS = {
  1: Building2,
  2: MapPin,
  3: Phone,
  4: Tags,
  5: Tags,
} as const;

function stepSubtitle(step: WizardStep, resuming: boolean): string {
  switch (step) {
    case 0:
      return resuming
        ? "Completa la ubicación y los datos de la sucursal."
        : "Escanea el RIF o ingresa los datos manualmente.";
    case 1:
      return "Revisa o completa los datos fiscales de la empresa.";
    case 2:
      return "Indica estado, ciudad y dirección de la sucursal.";
    case 3:
      return "Persona de contacto, teléfono y correo.";
    case 4:
      return "Selecciona o confirma la casa matriz.";
    case 5:
      return "Asigna los roles de esta sucursal.";
    default:
      return "";
  }
}

function mergeClientPatch(
  prev: BranchWizardValues,
  patch: Partial<ClientOnboardingValues>,
): BranchWizardValues {
  return { ...prev, ...patch };
}

export function BranchCreateWizardDialog({
  open,
  saving,
  error,
  resumeCompanyId = null,
  companies,
  branches,
  distributors,
  companiesLoading,
  onClose,
  onSubmit,
}: BranchCreateWizardDialogProps) {
  const [step, setStep] = useState<WizardStep>(0);
  const [inputMode, setInputMode] = useState<"ai" | "manual">("manual");
  const [form, setForm] = useState<BranchWizardValues>(emptyBranchWizardForm);
  const [aiFields, setAiFields] = useState<Set<SeniatLockableField>>(new Set());
  const [stepError, setStepError] = useState<string | null>(null);

  const resuming = resumeCompanyId != null;

  useEffect(() => {
    if (!open) return;
    if (resumeCompanyId != null) {
      const company = companies.find((c) => c.id === resumeCompanyId);
      setForm({
        ...emptyBranchWizardForm(),
        linkedCompanyId: resumeCompanyId,
        rif: company?.rif ?? "",
        businessName: company?.businessName ?? "",
        contributorType: company?.contributorType ?? "ordinario",
      });
      setStep(2);
      setInputMode("manual");
    } else {
      setForm(emptyBranchWizardForm());
      setStep(0);
      setInputMode("manual");
    }
    setAiFields(new Set());
    setStepError(null);
  }, [open, resumeCompanyId, companies]);

  if (!open) return null;

  const linkedCompany =
    form.linkedCompanyId != null
      ? companies.find((c) => c.id === form.linkedCompanyId)
      : undefined;

  const setClientForm: React.Dispatch<
    React.SetStateAction<ClientOnboardingValues>
  > = (action) => {
    setForm((prev) => {
      const patch =
        typeof action === "function" ? action(prev) : action;
      return mergeClientPatch(prev, patch);
    });
  };

  function startManualWizard() {
    setInputMode("manual");
    setAiFields(new Set());
    setStepError(null);
    setStep(1);
  }

  function applyExtracted(data: SeniatExtractResult) {
    const match = data.rif ? findCompanyByRif(companies, data.rif) : undefined;
    const filled = collectAiFilledFields(data);

    setForm((f) => ({
      ...f,
      rif: data.rif || f.rif,
      businessName:
        match?.businessName ?? (data.businessName || f.businessName),
      contributorType:
        match?.contributorType ??
        data.contributorType ??
        f.contributorType,
      linkedCompanyId: match?.id ?? null,
      state: data.state || f.state,
      city: data.city || f.city,
      address: data.address || f.address,
      phone: data.phone ?? f.phone,
      email: data.email ?? f.email,
    }));
    setAiFields(filled);
    setInputMode("ai");
    setStepError(null);
    setStep(1);
  }

  function validateSection(section: OnboardingStepSection): string | null {
    return validateOnboardingSection(section, form);
  }

  function goNext() {
    if (step === 1) {
      const err = validateSection("fiscal");
      if (err) {
        setStepError(err);
        return;
      }
      setStepError(null);
      setStep(2);
      return;
    }
    if (step === 2) {
      const err = validateSection("location");
      if (err) {
        setStepError(err);
        return;
      }
      setStepError(null);
      setStep(3);
      return;
    }
    if (step === 3) {
      const err = validateSection("contact");
      if (err) {
        setStepError(err);
        return;
      }
      setStepError(null);
      setStep(4);
      return;
    }
    if (step === 4) {
      const err = validateSection("headquarters");
      if (err) {
        setStepError(err);
        return;
      }
      setStepError(null);
      setStep(5);
    }
  }

  function goBack() {
    setStepError(null);
    if (step === 1) {
      if (resuming) return;
      setStep(0);
      return;
    }
    if (step > 1) {
      setStep((step - 1) as WizardStep);
    }
  }

  function submitRegistration() {
    const fiscalErr = validateSection("fiscal");
    if (fiscalErr) {
      setStepError(fiscalErr);
      setStep(1);
      return;
    }
    const locationErr = validateSection("location");
    if (locationErr) {
      setStepError(locationErr);
      setStep(2);
      return;
    }
    const contactErr = validateSection("contact");
    if (contactErr) {
      setStepError(contactErr);
      setStep(3);
      return;
    }
    const headquartersErr = validateSection("headquarters");
    if (headquartersErr) {
      setStepError(headquartersErr);
      setStep(4);
      return;
    }
    setStepError(null);
    const rif = form.rif.trim().toUpperCase();
    onSubmit({
      ...form,
      rif,
      businessName: form.businessName.trim(),
      state: form.state.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      contactPersonName: form.contactPersonName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    });
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < 5) {
      goNext();
      return;
    }
    submitRegistration();
  }

  const displayError = stepError ?? error;
  const currentFormStep = FORM_STEPS.find((s) => s.step === step);

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
      <div className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">
                Nueva sucursal
              </h2>
              <p className="mt-1 text-sm text-muted">
                {stepSubtitle(step, resuming)}
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

          {step > 0 && (
            <nav
              className="mt-4 flex gap-1"
              aria-label="Pasos del registro"
            >
              {FORM_STEPS.map(({ step: s, label }) => {
                const Icon = STEP_ICONS[s];
                const isActive = step === s;
                const isDone = step > s;
                const skipFiscal = resuming && s === 1;
                return (
                  <div
                    key={s}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition-colors",
                      skipFiscal && "opacity-50",
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
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {resuming && step >= 2 && (
            <p className="mb-4 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-sm text-card-foreground">
              La empresa ya está registrada. Completa los datos de la sucursal y
              pulsa «Crear sucursal».
            </p>
          )}

          {step === 0 ? (
            <SeniatDocumentScan
              variant="client"
              analyzeOnSelect
              onExtracted={applyExtracted}
              onRequestManual={startManualWizard}
              disabled={saving}
            />
          ) : (
            <form
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

              {currentFormStep?.section === "roles" ? (
                <BranchWizardRolesFields
                  form={form}
                  setForm={setForm}
                  saving={saving}
                  branches={branches}
                  distributors={distributors}
                  companies={companies}
                />
              ) : currentFormStep?.section === "headquarters" ? (
                <HeadquartersSelectorFields
                  companyId={form.linkedCompanyId}
                  mode={form.headquartersMode}
                  branchId={form.headquartersBranchId}
                  isHeadquarters={form.isHeadquarters}
                  branches={branches}
                  companies={companies}
                  disabled={saving}
                  onModeChange={(mode) =>
                    setForm((f) => ({
                      ...f,
                      headquartersMode: mode,
                      headquartersBranchId:
                        mode === "existing" ? f.headquartersBranchId : null,
                    }))
                  }
                  onBranchChange={(branchId) =>
                    setForm((f) => ({ ...f, headquartersBranchId: branchId }))
                  }
                  onHeadquartersChange={(value) =>
                    setForm((f) => ({ ...f, isHeadquarters: value }))
                  }
                />
              ) : currentFormStep ? (
                <ClientFormFields
                  form={form}
                  setForm={setClientForm}
                  saving={saving}
                  linkedCompany={linkedCompany}
                  inputMode={inputMode}
                  aiFields={aiFields}
                  section={currentFormStep.section}
                />
              ) : null}
            </form>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border px-4 py-4 sm:flex-row sm:justify-between sm:px-6 [&_button]:w-full sm:[&_button]:w-auto">
          {step === 0 ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5 sm:ml-auto"
            >
              Cancelar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={goBack}
                disabled={saving || (resuming && step === 2)}
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
                {step < 5 ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={goNext}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving || companiesLoading}
                    onClick={submitRegistration}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                      (saving || companiesLoading) &&
                        "cursor-not-allowed opacity-70",
                    )}
                  >
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    Crear sucursal
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
