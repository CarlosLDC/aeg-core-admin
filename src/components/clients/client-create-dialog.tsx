"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { ClientFormFields } from "@/components/clients/client-form-fields";
import { SeniatDocumentScan } from "@/components/seniat/seniat-document-scan";
import type { ClientOnboardingValues } from "@/lib/client-onboarding";
import {
  collectAiFilledFields,
  type SeniatLockableField,
} from "@/lib/seniat-ai-fields";
import {
  findCompanyByRif,
  RIF_PATTERN,
  type SeniatExtractResult,
} from "@/lib/seniat-extract";
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

const emptyForm = (): ClientOnboardingValues => ({
  rif: "",
  businessName: "",
  contributorType: "ordinario",
  linkedCompanyId: null,
  city: "",
  state: "",
  address: "",
  phone: "",
  email: "",
});

export function ClientCreateDialog({
  open,
  saving,
  error,
  companies,
  onClose,
  onSubmit,
}: ClientCreateDialogProps) {
  const [phase, setPhase] = useState<"scan" | "form">("scan");
  const [inputMode, setInputMode] = useState<"ai" | "manual">("ai");
  const [form, setForm] = useState<ClientOnboardingValues>(emptyForm);
  const [aiFields, setAiFields] = useState<Set<SeniatLockableField>>(new Set());
  const [rifError, setRifError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase("scan");
    setInputMode("ai");
    setForm(emptyForm());
    setAiFields(new Set());
    setRifError(null);
  }, [open]);

  if (!open) return null;

  const linkedCompany =
    form.linkedCompanyId != null
      ? companies.find((c) => c.id === form.linkedCompanyId)
      : undefined;

  function goToForm(mode: "ai" | "manual") {
    setInputMode(mode);
    setPhase("form");
    if (mode === "manual") {
      setAiFields(new Set());
    }
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
    setRifError(null);
    goToForm("ai");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const rif = form.rif.trim().toUpperCase();
    const companyLocked = Boolean(linkedCompany);

    if (!companyLocked && !RIF_PATTERN.test(rif)) {
      setRifError("Formato: letra V, E, J, P o G seguida de 7 a 9 dígitos.");
      return;
    }
    if (!companyLocked && !form.businessName.trim()) {
      setRifError("Indica la razón social del cliente.");
      return;
    }
    if (!form.state.trim() || !form.city.trim()) {
      setRifError("Estado y ciudad son obligatorios.");
      return;
    }
    setRifError(null);
    onSubmit({
      ...form,
      rif,
      businessName: form.businessName.trim(),
      state: form.state.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    });
  }

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
      <div className="relative max-h-[min(92vh,100dvh)] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              Nuevo cliente
            </h2>
            <p className="mt-1 text-sm text-muted">
              {phase === "scan"
                ? "Empieza escaneando el documento fiscal del cliente."
                : "Revisa los datos y completa teléfono y correo si hace falta."}
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

        {phase === "scan" ? (
          <SeniatDocumentScan
            variant="client"
            onExtracted={applyExtracted}
            onRequestManual={() => goToForm("manual")}
            disabled={saving}
          />
        ) : (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => setPhase("scan")}
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Volver al escaneo
            </button>

            {inputMode === "ai" && (
              <p className="mb-4 rounded-lg border border-teal-200/70 bg-teal-500/8 px-3 py-2 text-sm text-teal-900 dark:border-teal-500/25 dark:text-teal-100">
                Datos extraídos del documento. Completa contacto y revisa antes
                de registrar.
              </p>
            )}

            {(error || rifError) && (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {rifError ?? error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <ClientFormFields
                form={form}
                setForm={setForm}
                saving={saving}
                linkedCompany={linkedCompany}
                inputMode={inputMode}
                aiFields={aiFields}
              />

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-foreground/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={cn(
                    "flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                    saving && "cursor-not-allowed opacity-70",
                  )}
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  Registrar cliente
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
