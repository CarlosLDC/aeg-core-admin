"use client";

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

export type ClientFormSection = "fiscal" | "location" | "contact";

type ClientFormFieldsProps = {
  form: ClientOnboardingValues;
  setForm: React.Dispatch<React.SetStateAction<ClientOnboardingValues>>;
  saving: boolean;
  linkedCompany?: CompanyResponse;
  inputMode: "ai" | "manual";
  aiFields: Set<SeniatLockableField>;
  section: ClientFormSection;
};

function fieldLocked(
  field: SeniatLockableField,
  inputMode: "ai" | "manual",
  aiFields: Set<SeniatLockableField>,
  companyLocked: boolean,
): boolean {
  if (
    companyLocked &&
    (field === "rif" || field === "businessName" || field === "contributorType")
  ) {
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
  section,
}: ClientFormFieldsProps) {
  const companyLocked = Boolean(linkedCompany);

  if (section === "fiscal") {
    return (
      <fieldset className="space-y-4">
        <legend className="sr-only">Datos fiscales</legend>

        {linkedCompany && (
          <p className="rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-sm text-card-foreground">
            Cliente vinculado a empresa existente:{" "}
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
            disabled={
              saving || fieldLocked("rif", inputMode, aiFields, companyLocked)
            }
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
          <span className="mb-1.5 block text-sm font-medium">Razón social</span>
          <input
            type="text"
            required
            value={form.businessName}
            disabled={
              saving ||
              fieldLocked("businessName", inputMode, aiFields, companyLocked)
            }
            onChange={(e) =>
              setForm((f) => ({ ...f, businessName: e.target.value }))
            }
            className={clientFormInputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            Tipo de contribuyente
          </span>
          <select
            value={form.contributorType}
            disabled={
              saving ||
              fieldLocked("contributorType", inputMode, aiFields, companyLocked)
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
    );
  }

  if (section === "location") {
    return (
      <fieldset className="space-y-4">
        <legend className="sr-only">Ubicación</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Estado</span>
            <input
              type="text"
              required
              value={form.state}
              disabled={
                saving || fieldLocked("state", inputMode, aiFields, false)
              }
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              className={clientFormInputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Ciudad</span>
            <input
              type="text"
              required
              value={form.city}
              disabled={
                saving || fieldLocked("city", inputMode, aiFields, false)
              }
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className={clientFormInputClass}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Dirección</span>
          <textarea
            rows={4}
            value={form.address}
            disabled={
              saving || fieldLocked("address", inputMode, aiFields, false)
            }
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className={cn(clientFormInputClass, "min-h-[6rem] resize-y")}
          />
        </label>
      </fieldset>
    );
  }

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Contacto</legend>
      <p className="text-xs text-muted">
        Indica quién atiende en esta sucursal y cómo contactarla.
      </p>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Nombre persona de contacto
        </span>
        <input
          type="text"
          required
          value={form.contactPersonName}
          disabled={saving}
          onChange={(e) =>
            setForm((f) => ({ ...f, contactPersonName: e.target.value }))
          }
          placeholder="Ej. María Pérez"
          className={clientFormInputClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Teléfono</span>
          <input
            type="tel"
            value={form.phone}
            disabled={saving}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="Ej. 0412 1234567"
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
            placeholder="Ej. contacto@empresa.com"
            className={clientFormInputClass}
          />
        </label>
      </div>
    </fieldset>
  );
}
