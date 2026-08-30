"use client";

import { ContributorTypeToggle } from "@/components/companies/contributor-type-toggle";
import { FieldLabel } from "@/components/ui/field-label";
import { PhoneInput } from "@/components/ui/phone-input";
import { PrefixedDocumentInput } from "@/components/ui/prefixed-document-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { ClientOnboardingValues } from "@/lib/client-onboarding";
import {
  isFieldLockedByAi,
  type SeniatLockableField,
} from "@/lib/seniat-ai-fields";
import type { CompanyResponse } from "@/types/company";
import {
  FORM_FIELD_TEXTAREA_ROWS,
  formFieldInputClass,
  formFieldTextareaClass,
} from "@/lib/toggle-button-styles";
import {
  resolveVenezuelanStateCatalogValue,
  venezuelanStateSelectOptions,
} from "@/lib/venezuelan-states";
import { cn } from "@/lib/utils";

const stateSelectOptions = venezuelanStateSelectOptions();

export const clientFormInputClass = cn(
  formFieldInputClass,
  "disabled:bg-foreground/[0.03] disabled:text-muted disabled:opacity-100",
);

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
          <FieldLabel required>RIF</FieldLabel>
          <PrefixedDocumentInput
            kind="rif"
            required
            value={form.rif}
            disabled={
              saving || fieldLocked("rif", inputMode, aiFields, companyLocked)
            }
            onChange={(rif) =>
              setForm((f) => ({
                ...f,
                rif,
                linkedCompanyId: null,
              }))
            }
          />
        </label>

        <label className="block">
          <FieldLabel required>Razón social</FieldLabel>
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

        <ContributorTypeToggle
          label="Tipo de contribuyente"
          required
          value={form.contributorType}
          disabled={
            saving ||
            fieldLocked("contributorType", inputMode, aiFields, companyLocked)
          }
          onChange={(contributorType) =>
            setForm((f) => ({ ...f, contributorType }))
          }
        />
      </fieldset>
    );
  }

  if (section === "location") {
    return (
      <fieldset className="space-y-4">
        <legend className="sr-only">Ubicación</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel required>Estado</FieldLabel>
            <SearchableSelect
              value={resolveVenezuelanStateCatalogValue(form.state)}
              onChange={(state) => setForm((f) => ({ ...f, state }))}
              options={stateSelectOptions}
              disabled={
                saving || fieldLocked("state", inputMode, aiFields, false)
              }
              required
              preloadOptions
              emptyLabel="Seleccionar estado"
              searchPlaceholder="Buscar estado…"
              modalTitle="Estado"
            />
          </label>
          <label className="block">
            <FieldLabel required>Ciudad</FieldLabel>
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
          <FieldLabel required>Dirección</FieldLabel>
          <textarea
            rows={FORM_FIELD_TEXTAREA_ROWS}
            required
            value={form.address}
            disabled={
              saving || fieldLocked("address", inputMode, aiFields, false)
            }
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className={formFieldTextareaClass}
          />
        </label>
      </fieldset>
    );
  }

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Contacto</legend>

      <label className="block">
        <FieldLabel>Nombre persona de contacto</FieldLabel>
        <input
          type="text"
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
          <FieldLabel>Teléfono</FieldLabel>
          <PhoneInput
            value={form.phone}
            disabled={saving}
            onChange={(phone) => setForm((f) => ({ ...f, phone }))}
            placeholder="412 185 1051"
            className={clientFormInputClass}
          />
        </label>
        <label className="block">
          <FieldLabel>Correo</FieldLabel>
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
