"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Loader2, MapPin, X } from "lucide-react";
import { DistributorSelect } from "@/components/branches/distributor-select";
import { SeniatDocumentScan } from "@/components/seniat/seniat-document-scan";
import { CONTRIBUTOR_LABELS } from "@/lib/contributor-types";
import {
  findCompanyByRif,
  RIF_PATTERN,
  type SeniatExtractResult,
} from "@/lib/seniat-extract";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import {
  CONTRIBUTOR_TYPES,
  type CompanyResponse,
  type ContributorType,
} from "@/types/company";
import { cn } from "@/lib/utils";

export type BranchWizardValues = {
  rif: string;
  businessName: string;
  contributorType: ContributorType;
  linkedCompanyId: number | null;
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  isClient: boolean;
  isDistributor: boolean;
  isServiceCenter: boolean;
  clientDistributorId: string;
};

type BranchCreateWizardDialogProps = {
  open: boolean;
  saving: boolean;
  error: string | null;
  /** Empresa ya creada en un intento anterior (reintento de sucursal). */
  resumeCompanyId?: number | null;
  companies: CompanyResponse[];
  branches: BranchResponse[];
  distributors: DistributorResponse[];
  companiesLoading: boolean;
  onClose: () => void;
  onSubmit: (values: BranchWizardValues) => void;
};

const emptyForm = (): BranchWizardValues => ({
  rif: "",
  businessName: "",
  contributorType: "ordinario",
  linkedCompanyId: null,
  city: "",
  state: "",
  address: "",
  phone: "",
  email: "",
  isClient: false,
  isDistributor: false,
  isServiceCenter: false,
  clientDistributorId: "",
});

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
  const [form, setForm] = useState<BranchWizardValues>(emptyForm);
  const [rifError, setRifError] = useState<string | null>(null);
  const [scanApplied, setScanApplied] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (resumeCompanyId != null) {
      const company = companies.find((c) => c.id === resumeCompanyId);
      setForm({
        ...emptyForm(),
        linkedCompanyId: resumeCompanyId,
        rif: company?.rif ?? "",
        businessName: company?.businessName ?? "",
        contributorType: company?.contributorType ?? "ordinario",
      });
    } else {
      setForm(emptyForm());
    }
    setRifError(null);
    setScanApplied(false);
  }, [open, resumeCompanyId, companies]);

  if (!open) return null;

  const linkedCompany =
    form.linkedCompanyId != null
      ? companies.find((c) => c.id === form.linkedCompanyId)
      : undefined;
  const companyLocked = Boolean(linkedCompany);

  function applyExtracted(data: SeniatExtractResult) {
    const match = data.rif ? findCompanyByRif(companies, data.rif) : undefined;

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
    setScanApplied(true);
    setRifError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const rif = form.rif.trim().toUpperCase();
    if (!companyLocked && !RIF_PATTERN.test(rif)) {
      setRifError("Formato: letra V, E, J, P o G seguida de 7 a 9 dígitos.");
      return;
    }
    if (!companyLocked && !form.businessName.trim()) {
      setRifError("Indica la razón social de la empresa.");
      return;
    }
    if (!form.state.trim() || !form.city.trim()) {
      setRifError("Estado y ciudad son obligatorios para la sucursal.");
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

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-foreground/[0.03] disabled:text-muted";

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
              Nueva sucursal
            </h2>
            <p className="mt-1 text-sm text-muted">
              Escanea el documento fiscal o completa empresa y ubicación. Si el
              RIF ya existe, se vincula automáticamente.
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

        <SeniatDocumentScan
          onExtracted={applyExtracted}
          disabled={saving}
          className="mb-5"
        />

        {scanApplied && (
          <p className="mb-4 rounded-lg border border-teal-200/70 bg-teal-500/8 px-3 py-2 text-sm text-teal-900 dark:border-teal-500/25 dark:text-teal-100">
            Datos sugeridos por IA aplicados. Revisa antes de guardar.
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
          <fieldset className="space-y-4 rounded-lg border border-border p-4">
            <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-card-foreground">
              <Building2 className="size-4 text-accent" />
              Empresa (datos SENIAT)
            </legend>

            {linkedCompany && (
              <p className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-sm text-card-foreground">
                Empresa existente vinculada:{" "}
                <span className="font-medium">
                  {linkedCompany.businessName || linkedCompany.rif}
                </span>{" "}
                <span className="font-mono text-xs text-muted">
                  ({linkedCompany.rif})
                </span>
              </p>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">RIF</span>
              <input
                type="text"
                required
                value={form.rif}
                disabled={saving || companyLocked}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    rif: e.target.value.toUpperCase(),
                    linkedCompanyId: null,
                  }))
                }
                placeholder="J123456789"
                className={cn(inputClass, "font-mono uppercase")}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Razón social
              </span>
              <input
                type="text"
                required
                value={form.businessName}
                disabled={saving || companyLocked}
                onChange={(e) =>
                  setForm((f) => ({ ...f, businessName: e.target.value }))
                }
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Tipo de contribuyente
              </span>
              <select
                value={form.contributorType}
                disabled={saving || companyLocked}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    contributorType: e.target.value as ContributorType,
                  }))
                }
                className={inputClass}
              >
                {CONTRIBUTOR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CONTRIBUTOR_LABELS[type]} ({type})
                  </option>
                ))}
              </select>
            </label>
          </fieldset>

          <fieldset className="space-y-4 rounded-lg border border-border p-4">
            <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-card-foreground">
              <MapPin className="size-4 text-accent" />
              Sucursal (ubicación)
            </legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Estado</span>
                <input
                  type="text"
                  required
                  value={form.state}
                  disabled={saving}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, state: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Ciudad</span>
                <input
                  type="text"
                  required
                  value={form.city}
                  disabled={saving}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Dirección</span>
              <input
                type="text"
                value={form.address}
                disabled={saving}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                className={inputClass}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Teléfono</span>
                <input
                  type="tel"
                  value={form.phone}
                  disabled={saving}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Email</span>
                <input
                  type="email"
                  value={form.email}
                  disabled={saving}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-medium">Roles de sucursal</legend>
            <p className="text-xs text-muted">
              Cada rol crea un registro vinculado a la sucursal.
            </p>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["isDistributor", "Distribuidor"],
                  ["isClient", "Cliente"],
                  ["isServiceCenter", "Centro de servicio"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form[key]}
                    disabled={saving}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [key]: e.target.checked,
                        ...(key === "isClient" && !e.target.checked
                          ? { clientDistributorId: "" }
                          : {}),
                      }))
                    }
                    className="size-4 rounded border-border accent-accent"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            {form.isClient && (
              <label className="block pt-1">
                <span className="mb-1.5 block text-sm font-medium">
                  Distribuidor del cliente
                </span>
                <DistributorSelect
                  value={form.clientDistributorId}
                  onChange={(clientDistributorId) =>
                    setForm((f) => ({ ...f, clientDistributorId }))
                  }
                  distributors={distributors}
                  branches={branches}
                  companies={companies}
                />
              </label>
            )}
          </fieldset>

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
              disabled={saving || companiesLoading}
              className={cn(
                "flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground",
                (saving || companiesLoading) && "cursor-not-allowed opacity-70",
              )}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Crear sucursal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
