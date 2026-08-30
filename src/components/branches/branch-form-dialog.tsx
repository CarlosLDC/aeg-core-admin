"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { PhoneInput } from "@/components/ui/phone-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CompanySelect } from "@/components/companies/company-select";
import { BranchOperationalRoleFields } from "@/components/branches/branch-operational-role-fields";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { zodFieldErrors } from "@/lib/form-zod";
import { organizationRoleFromBranch } from "@/lib/organization-roles";
import { branchFormSchema } from "@/lib/schemas/branch-form-schema";
import {
  resolveVenezuelanStateCatalogValue,
  venezuelanStateSelectOptions,
} from "@/lib/venezuelan-states";
import type { BranchRoleFormState } from "@/lib/branch-roles";
import type { BranchResponse, BranchWithRoles } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { BranchOrganizationRole } from "@/types/organization";

export type BranchFormValues = {
  companyId: string;
  city: string;
  state: string;
  address: string;
  contactPersonName: string;
  phone: string;
  email: string;
  organizationRole: BranchOrganizationRole;
  isClient: boolean;
  clientDistributorId: string;
  canWriteAnnualInspection: boolean;
};

type BranchFormDialogProps = {
  mode: "create" | "edit";
  branch?: BranchWithRoles;
  companies: CompanyResponse[];
  lockedCompanyId?: number;
  branches: BranchResponse[];
  distributors: DistributorResponse[];
  companiesLoading: boolean;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: BranchFormValues) => void;
};

const stateSelectOptions = venezuelanStateSelectOptions();

const emptyForm: BranchFormValues = {
  companyId: "",
  city: "",
  state: "",
  address: "",
  contactPersonName: "",
  phone: "",
  email: "",
  organizationRole: "NONE",
  isClient: false,
  clientDistributorId: "",
  canWriteAnnualInspection: true,
};

function rolesFromBranch(branch: BranchWithRoles): BranchRoleFormState {
  return {
    organizationRole: organizationRoleFromBranch(branch),
    isClient: Boolean(branch.client),
    clientDistributorId: branch.client?.distributorId
      ? String(branch.client.distributorId)
      : "",
    canWriteAnnualInspection:
      branch.distributor?.canWriteAnnualInspection !== false,
  };
}

export function BranchFormDialog({
  mode,
  branch,
  companies,
  lockedCompanyId,
  branches,
  distributors,
  companiesLoading,
  open,
  saving,
  error,
  onClose,
  onSubmit,
}: BranchFormDialogProps) {
  const titleId = useId();
  const [form, setForm] = useState<BranchFormValues>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof BranchFormValues, string>>
  >({});

  const forcedCompanyId =
    lockedCompanyId != null ? String(lockedCompanyId) : null;

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    if (mode === "edit" && branch) {
      const roles = rolesFromBranch(branch);
      setForm({
        companyId: forcedCompanyId ?? String(branch.companyId),
        city: branch.city,
        state: branch.state,
        address: branch.address ?? "",
        contactPersonName: branch.contactPersonName ?? "",
        phone: branch.phone ?? "",
        email: branch.email ?? "",
        organizationRole: roles.organizationRole,
        isClient: roles.isClient,
        clientDistributorId: roles.clientDistributorId,
        canWriteAnnualInspection: roles.canWriteAnnualInspection,
      });
    } else {
      setForm((prev) => ({
        ...emptyForm,
        companyId: forcedCompanyId ?? prev.companyId,
      }));
    }
  }, [open, mode, branch, forcedCompanyId]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = branchFormSchema.safeParse({
      ...form,
      companyId: (forcedCompanyId ?? form.companyId).trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      address: form.address.trim(),
      contactPersonName: form.contactPersonName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    });
    const errors = zodFieldErrors(parsed);
    if (errors || !parsed.success) {
      if (errors) setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    onSubmit({
      ...parsed.data,
      address: parsed.data.address ?? "",
      contactPersonName: parsed.data.contactPersonName ?? "",
      phone: parsed.data.phone ?? "",
      email: parsed.data.email ?? "",
    });
  }

  const branchIdForExclude =
    mode === "edit" && branch ? branch.id : undefined;
  const selectedCompany = companies.find(
    (company) => company.id === Number(forcedCompanyId ?? form.companyId),
  );

  const inputClass = formFieldInputClass;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold text-card-foreground"
            >
              {mode === "create" ? "Nueva empresa" : "Editar empresa"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Configura ubicación, contacto y roles operativos de la empresa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Ubicación
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <FieldLabel required>Empresa</FieldLabel>
                <CompanySelect
                  value={forcedCompanyId ?? form.companyId}
                  onChange={(companyId) =>
                    setForm((f) => ({ ...f, companyId }))
                  }
                  companies={companies}
                  loading={companiesLoading}
                  disabled={companiesLoading || forcedCompanyId != null}
                  required
                />
              </label>

              <label className="block">
                <FieldLabel required>Ciudad</FieldLabel>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  aria-invalid={Boolean(fieldErrors.city)}
                  className={inputClass}
                />
                {fieldErrors.city && (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.city}</p>
                )}
              </label>
              <label className="block">
                <FieldLabel required>Estado</FieldLabel>
                <SearchableSelect
                  value={resolveVenezuelanStateCatalogValue(form.state)}
                  onChange={(state) =>
                    setForm((f) => ({ ...f, state }))
                  }
                  options={stateSelectOptions}
                  disabled={saving}
                  required
                  preloadOptions
                  emptyLabel="Seleccionar estado"
                  searchPlaceholder="Buscar estado…"
                  modalTitle="Estado"
                />
                {fieldErrors.state && (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.state}</p>
                )}
              </label>

              <label className="block sm:col-span-2">
                <FieldLabel required>Dirección</FieldLabel>
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  aria-invalid={Boolean(fieldErrors.address)}
                  className={inputClass}
                />
                {fieldErrors.address ? (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                    {fieldErrors.address}
                  </p>
                ) : null}
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-card-foreground">
              Contacto
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <FieldLabel>Nombre persona de contacto</FieldLabel>
                <input
                  type="text"
                  value={form.contactPersonName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactPersonName: e.target.value }))
                  }
                  placeholder="Ej. María Pérez"
                  aria-invalid={Boolean(fieldErrors.contactPersonName)}
                  className={inputClass}
                />
                {fieldErrors.contactPersonName && (
                  <p className="mt-1 text-xs text-rose-600">
                    {fieldErrors.contactPersonName}
                  </p>
                )}
              </label>

              <label className="block">
                <FieldLabel>Teléfono</FieldLabel>
                <PhoneInput
                  value={form.phone}
                  onChange={(phone) =>
                    setForm((f) => ({ ...f, phone }))
                  }
                  placeholder="412 185 1051"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <FieldLabel>Email</FieldLabel>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-medium">Roles de empresa</legend>
            <BranchOperationalRoleFields
              values={{
                organizationRole: form.organizationRole,
                isClient: form.isClient,
                clientDistributorId: form.clientDistributorId,
                canWriteAnnualInspection: form.canWriteAnnualInspection,
              }}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
              disabled={saving}
              branches={branches}
              distributors={distributors}
              companies={companies}
              companyOrganizationType={selectedCompany?.organizationType}
              excludeBranchId={branchIdForExclude}
            />
          </fieldset>

          <FormDialogFooter
            mode={mode}
            saving={saving}
            submitDisabled={companiesLoading || !form.companyId}
            onClose={onClose}
          />
        </form>
      </div>
    </div>
  );
}
