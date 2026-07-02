"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import {
  Building2,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Tags,
  X,
} from "lucide-react";
import { BranchWizardContractFields } from "@/components/branches/branch-wizard-contract-fields";
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
import { useAuth } from "@/context/auth-provider";
import { canCreateContractRecord } from "@/lib/api-permissions";
import { validateBranchWizardContracts } from "@/lib/branch-wizard-contracts";
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
import { normalizeStateName } from "@/lib/state-label";
import { cn } from "@/lib/utils";

export type { BranchWizardValues } from "@/components/branches/branch-wizard-types";

type BranchCreateWizardDialogProps = {
  mode?: "create" | "edit";
  open: boolean;
  saving: boolean;
  error: string | null;
  initialValues?: BranchWizardValues | null;
  resumeCompanyId?: number | null;
  companies: CompanyResponse[];
  branches: BranchResponse[];
  distributors: DistributorResponse[];
  companiesLoading: boolean;
  enableContractStep?: boolean;
  onClose: () => void;
  onSubmit: (values: BranchWizardValues) => void;
};

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

type FormStepDef = {
  step: 1 | 2 | 3 | 4 | 5;
  section: ClientFormSection | "roles" | "contract";
  label: string;
};

const BASE_FORM_STEPS: FormStepDef[] = [
  { step: 1, section: "fiscal", label: "Fiscal" },
  { step: 2, section: "location", label: "Ubicación" },
  { step: 3, section: "contact", label: "Contacto" },
  { step: 4, section: "roles", label: "Roles" },
];

const CONTRACT_FORM_STEP: FormStepDef = {
  step: 5,
  section: "contract",
  label: "Contrato",
};

const STEP_ICONS = {
  1: Building2,
  2: MapPin,
  3: Phone,
  4: Tags,
  5: FileText,
} as const;

function stepSubtitle(step: WizardStep, resuming: boolean): string {
  switch (step) {
    case 0:
      return resuming
        ? "Completa la ubicación y los datos de la empresa."
        : "Escanea el RIF o ingresa los datos manualmente.";
    case 1:
      return "Revisa o completa los datos fiscales de la empresa.";
    case 2:
      return "Indica estado, ciudad y dirección de la empresa.";
    case 3:
      return "Persona de contacto, teléfono y correo.";
    case 4:
      return "Asigna los roles de esta empresa.";
    case 5:
      return "Sube el primer contrato de cada rol operativo seleccionado.";
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

function isClientFormSection(
  section: FormStepDef["section"],
): section is ClientFormSection {
  return (
    section === "fiscal" ||
    section === "location" ||
    section === "contact"
  );
}

export function BranchCreateWizardDialog({
  mode = "create",
  open,
  saving,
  error,
  initialValues = null,
  resumeCompanyId = null,
  companies,
  branches,
  distributors,
  companiesLoading,
  enableContractStep = true,
  onClose,
  onSubmit,
}: BranchCreateWizardDialogProps) {
  const { user } = useAuth();
  const formId = useId();
  const [step, setStep] = useState<WizardStep>(0);
  const [inputMode, setInputMode] = useState<"ai" | "manual">("manual");
  const [form, setForm] = useState<BranchWizardValues>(emptyBranchWizardForm);
  const [aiFields, setAiFields] = useState<Set<SeniatLockableField>>(new Set());
  const [stepError, setStepError] = useState<string | null>(null);

  const isEdit = mode === "edit";
  const resuming = !isEdit && resumeCompanyId != null;

  const canShowContractStep =
    enableContractStep &&
    !isEdit &&
    user?.role === "ADMIN" &&
    canCreateContractRecord(user.role);

  const needsContractStep =
    canShowContractStep &&
    (form.organizationRole === "DISTRIBUTOR" ||
      form.organizationRole === "SERVICE_CENTER");

  const visibleFormSteps = useMemo(
    () =>
      needsContractStep
        ? [...BASE_FORM_STEPS, CONTRACT_FORM_STEP]
        : BASE_FORM_STEPS,
    [needsContractStep],
  );

  const lastFormStep: 4 | 5 = needsContractStep ? 5 : 4;

  useEffect(() => {
    if (!open) return;
    if (isEdit && initialValues) {
      setForm(initialValues);
      setStep(1);
      setInputMode("manual");
    } else if (resumeCompanyId != null) {
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
  }, [open, isEdit, initialValues, resumeCompanyId, companies]);

  useEffect(() => {
    if (step === 5 && !needsContractStep) {
      setStep(4);
    }
  }, [step, needsContractStep]);

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

  function goToStep(target: 1 | 2 | 3 | 4 | 5) {
    if (target === 5 && !needsContractStep) return;
    setStepError(null);
    setStep(target);
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
    if (needsContractStep) {
      const contractErr = validateBranchWizardContracts(form, {
        organizationRole: form.organizationRole,
      });
      if (contractErr) {
        setStepError(contractErr);
        setStep(5);
        return;
      }
    }
    setStepError(null);
    const rif = form.rif.trim().toUpperCase();
    onSubmit({
      ...form,
      rif,
      businessName: form.businessName.trim(),
      state: normalizeStateName(form.state),
      city: form.city.trim(),
      address: form.address.trim(),
      contactPersonName: form.contactPersonName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    });
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < lastFormStep) {
      const section = currentFormStep?.section;
      if (section && isClientFormSection(section)) {
        const err = validateSection(section);
        if (err) {
          setStepError(err);
          return;
        }
      }
      setStepError(null);
      setStep((step + 1) as WizardStep);
      return;
    }
    submitRegistration();
  }

  function goBack() {
    setStepError(null);
    if (step === 1) {
      if (resuming || isEdit) return;
      setStep(0);
      return;
    }
    if (step > 1) {
      setStep((step - 1) as WizardStep);
    }
  }

  const displayError = stepError ?? error;
  const currentFormStep = visibleFormSteps.find((s) => s.step === step);
  const isContractStep = currentFormStep?.section === "contract";

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
                {isEdit ? "Editar empresa" : "Nueva empresa"}
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
              {visibleFormSteps.map(({ step: s, label }) => {
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
          )}
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 px-4 sm:px-6",
            isContractStep
              ? "flex flex-col overflow-hidden py-3"
              : "overflow-y-auto py-4",
          )}
        >
          {resuming && step >= 2 && step < 5 && (
            <p className="mb-4 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-sm text-card-foreground">
              El RIF ya está registrado. Completa ubicación y contacto y pulsa
              «Crear empresa».
            </p>
          )}

          {step === 0 && !isEdit ? (
            <SeniatDocumentScan
              variant="client"
              analyzeOnSelect
              onExtracted={applyExtracted}
              onRequestManual={startManualWizard}
              disabled={saving}
            />
          ) : (
            <form
              id={formId}
              onSubmit={handleFormSubmit}
              className={cn(
                "flex flex-col",
                isContractStep ? "min-h-0 flex-1" : "h-full",
              )}
            >
              {displayError && (
                <p
                  role="alert"
                  className={cn(
                    "shrink-0 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300",
                    isContractStep ? "mb-2" : "mb-4",
                  )}
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
                  companyOrganizationType={linkedCompany?.organizationType}
                />
              ) : isContractStep ? (
                <BranchWizardContractFields
                  form={form}
                  setForm={setForm}
                  saving={saving}
                  className="min-h-0 flex-1"
                />
              ) : currentFormStep &&
                isClientFormSection(currentFormStep.section) ? (
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
                {step < lastFormStep ? (
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
                    disabled={saving || companiesLoading}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                      (saving || companiesLoading) &&
                        "cursor-not-allowed opacity-70",
                    )}
                  >
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    {isEdit ? "Guardar empresa" : "Crear empresa"}
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
