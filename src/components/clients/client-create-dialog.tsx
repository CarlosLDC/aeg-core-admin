"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { Building2, Loader2, MapPin, Phone, X } from "lucide-react";
import {
  ClientFormFields,
  type ClientFormSection,
} from "@/components/clients/client-form-fields";
import { SeniatDocumentScan } from "@/components/seniat/seniat-document-scan";
import { FormDialogFooterBar } from "@/components/ui/form-dialog-footer";
import type { ClientOnboardingValues } from "@/lib/client-onboarding";
import { normalizeStateName } from "@/lib/state-label";
import { resolveVenezuelanStateCatalogValue } from "@/lib/venezuelan-states";
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
import type { CompanyResponse } from "@/types/company";
import { cn } from "@/lib/utils";

type ClientCreateDialogProps = {
  open: boolean;
  saving: boolean;
  error: string | null;
  companies: CompanyResponse[];
  onClose: () => void;
  onSubmit: (values: ClientOnboardingValues) => void;
};

type WizardStep = 0 | 1 | 2 | 3;

const FORM_STEPS: {
  step: 1 | 2 | 3;
  section: ClientFormSection;
  label: string;
}[] =
  [
    { step: 1, section: "fiscal", label: "Fiscal" },
    { step: 2, section: "location", label: "Ubicación" },
    { step: 3, section: "contact", label: "Contacto" },
  ];

const STEP_ICONS = {
  1: Building2,
  2: MapPin,
  3: Phone,
} as const;

const emptyForm = (): ClientOnboardingValues => ({
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
});

function stepSubtitle(step: WizardStep): string {
  switch (step) {
    case 0:
      return "Escanea el RIF o ingresa los datos manualmente.";
    case 1:
      return "Revisa o completa los datos fiscales del cliente.";
    case 2:
      return "Indica estado, ciudad y dirección de la empresa.";
    case 3:
      return "Persona de contacto, teléfono y correo.";
    default:
      return "";
  }
}

export function ClientCreateDialog({
  open,
  saving,
  error,
  companies,
  onClose,
  onSubmit,
}: ClientCreateDialogProps) {
  const formId = useId();
  const [step, setStep] = useState<WizardStep>(0);
  const [inputMode, setInputMode] = useState<"ai" | "manual">("manual");
  const [form, setForm] = useState<ClientOnboardingValues>(emptyForm);
  const [aiFields, setAiFields] = useState<Set<SeniatLockableField>>(new Set());
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setInputMode("manual");
    setForm(emptyForm());
    setAiFields(new Set());
    setStepError(null);
  }, [open]);

  if (!open) return null;

  const linkedCompany =
    form.linkedCompanyId != null
      ? companies.find((c) => c.id === form.linkedCompanyId)
      : undefined;

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
        data.businessName || match?.businessName || f.businessName,
      contributorType:
        match?.contributorType ??
        data.contributorType ??
        f.contributorType,
      linkedCompanyId: match?.id ?? null,
      state:
        resolveVenezuelanStateCatalogValue(data.state || "") || f.state,
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

  function goToStep(target: 1 | 2 | 3) {
    setStepError(null);
    setStep(target);
  }

  function goNext() {
    setStepError(null);
    if (step < 3) {
      setStep((step + 1) as WizardStep);
    }
  }

  function goBack() {
    setStepError(null);
    if (step === 1) {
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
    if (step < 3) {
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
                Nuevo cliente
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

          {step > 0 && (
            <nav
              className="mt-4 flex gap-1"
              aria-label="Pasos del registro"
            >
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
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-4 py-4 sm:px-6">
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

              {currentFormStep && (
                <div className="space-y-4">
                  <ClientFormFields
                    form={form}
                    setForm={setForm}
                    saving={saving}
                    linkedCompany={linkedCompany}
                    inputMode={inputMode}
                    aiFields={aiFields}
                    section={currentFormStep.section}
                  />
                </div>
              )}
            </form>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
          <FormDialogFooterBar>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between [&_button]:w-full sm:[&_button]:w-auto">
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
                disabled={saving}
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
                    Registrar cliente
                  </button>
                )}
              </div>
            </>
          )}
          </div>
          </FormDialogFooterBar>
        </div>
      </div>
    </div>
  );
}
