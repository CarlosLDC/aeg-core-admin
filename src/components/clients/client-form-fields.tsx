"use client";

import { Building2, MapPin, Phone } from "lucide-react";
import { CONTRIBUTOR_LABELS } from "@/lib/contributor-types";
import {
  isFieldLockedByAi,
  type SeniatLockableField,
} from "@/lib/seniat-ai-fields";
import {
  CONTRIBUTOR_TYPES,
  type CompanyResponse,
  type ContributorType,
} from "@/types/company";
import type { ClientOnboardingValues } from "@/lib/client-onboarding";
import { cn } from "@/lib/utils";

export const clientFormInputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-foreground/[0.03] disabled:text-muted";

type ClientFormFieldsProps = {
  form: ClientOnboardingValues;
  setForm: React.Dispatch<React.SetStateAction<ClientOnboardingValues>>;
  saving: boolean;
  linkedCompany?: CompanyResponse;
  inputMode: "ai" | "manual";
  aiFields: Set<SeniatLockableField>;
};

function AiBadge() {
  return (
    <span className="ml-2 inline-flex rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-800 dark:text-teal-200">
      Extraído del documento
    </span>
  );
}

function fieldLocked(
  field: SeniatLockableField,
  inputMode: "ai" | "manual",
  aiFields: Set<SeniatLockableField>,
  companyLocked: boolean,
): boolean {
  if (companyLocked && (field === "rif" || field === "businessName" || field === "contributorType")) {
    return true;
  }
  return isFieldLockedByAi(field, inputMode, aiFields);
}

export function ClientFormFields({
  form,
  setForm,
  saving,
  linkedCompany,
  inputMode,
  aiFields,
}: ClientFormFieldsProps) {
  const companyLocked = Boolean(linkedCompany);

  return (
    <>
      <fieldset className="space-y-4 rounded-lg border border-border p-4">
        <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-card-foreground">
          <Building2 className="size-4 text-accent" />
          Datos fiscales
        </legend>

        {linkedCompany && (
          <p className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-sm text-card-foreground">
            Cliente vinculado a empresa existente:{" "}
            <span className="font-medium">
              {linkedCompany.businessName || linkedCompany.rif}
            </span>{" "}
            <span className="font-mono text-xs text-muted">({linkedCompany.rif})</span>
          </p>
        )}

        <label className="block">
          <span className="mb-1.5 flex flex-wrap items-center text-sm font-medium">
            RIF
            {fieldLocked("rif", inputMode, aiFields, companyLocked) && <AiBadge />}
          </span>
          <input
            type="text"
            required
            value={form.rif}
            disabled={saving || fieldLocked("rif", inputMode, aiFields, companyLocked)}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                rif: e.target.value.toUpperCase(),
                linkedCompanyId: null,
              }))
            }
            placeholder="J123456789"
            className={cn(clientFormInputClass, "font-mono uppercase")}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex flex-wrap items-center text-sm font-medium">
            Razón social
            {fieldLocked("businessName", inputMode, aiFields, companyLocked) && (
              <AiBadge />
            )}
          </span>
          <input
            type="text"
            required
            value={form.businessName}
            disabled={
              saving || fieldLocked("businessName", inputMode, aiFields, companyLocked)
            }
            onChange={(e) =>
              setForm((f) => ({ ...f, businessName: e.target.value }))
            }
            className={clientFormInputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex flex-wrap items-center text-sm font-medium">
            Tipo de contribuyente
            {fieldLocked("contributorType", inputMode, aiFields, companyLocked) && (
              <AiBadge />
            )}
          </span>
          <select
            value={form.contributorType}
            disabled={
              saving || fieldLocked("contributorType", inputMode, aiFields, companyLocked)
            }
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                contributorType: e.target.value as ContributorType,
              }))
            }
            className={clientFormInputClass}
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
          Ubicación
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex flex-wrap items-center text-sm font-medium">
              Estado
              {fieldLocked("state", inputMode, aiFields, false) && <AiBadge />}
            </span>
            <input
              type="text"
              required
              value={form.state}
              disabled={saving || fieldLocked("state", inputMode, aiFields, false)}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              className={clientFormInputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex flex-wrap items-center text-sm font-medium">
              Ciudad
              {fieldLocked("city", inputMode, aiFields, false) && <AiBadge />}
            </span>
            <input
              type="text"
              required
              value={form.city}
              disabled={saving || fieldLocked("city", inputMode, aiFields, false)}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className={clientFormInputClass}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 flex flex-wrap items-center text-sm font-medium">
            Dirección
            {fieldLocked("address", inputMode, aiFields, false) && <AiBadge />}
          </span>
          <input
            type="text"
            value={form.address}
            disabled={saving || fieldLocked("address", inputMode, aiFields, false)}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className={clientFormInputClass}
          />
        </label>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border p-4">
        <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-card-foreground">
          <Phone className="size-4 text-accent" />
          Contacto
        </legend>
        <p className="text-xs text-muted">
          Completa teléfono y correo si no aparecen en el documento fiscal.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Teléfono</span>
            <input
              type="tel"
              value={form.phone}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Opcional si no está en el PDF"
              className={clientFormInputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Correo</span>
            <input
              type="email"
              value={form.email}
              disabled={saving}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Opcional si no está en el PDF"
              className={clientFormInputClass}
            />
          </label>
        </div>
      </fieldset>
    </>
  );
}
