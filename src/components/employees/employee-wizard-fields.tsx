"use client";

import { BranchSelect } from "@/components/users/branch-select";
import { FieldLabel } from "@/components/ui/field-label";
import {
  EMPLOYEE_UI_ROLE_LABELS,
  type EmployeeUiRole,
} from "@/lib/employee-roles";
import type { EmployeeFormValues } from "@/lib/employee-form";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import { cn } from "@/lib/utils";

export type EmployeeWizardSection = "profile" | "assignment";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

type EmployeeWizardFieldsProps = {
  section: EmployeeWizardSection;
  form: EmployeeFormValues;
  setForm: React.Dispatch<React.SetStateAction<EmployeeFormValues>>;
  saving: boolean;
  branchesLoading: boolean;
  branches: BranchResponse[];
  companies: CompanyResponse[];
  roleOptions: EmployeeUiRole[];
  canEditProfile: boolean;
  canEditRole: boolean;
  lockBranch: boolean;
};

export function EmployeeWizardFields({
  section,
  form,
  setForm,
  saving,
  branchesLoading,
  branches,
  companies,
  roleOptions,
  canEditProfile,
  canEditRole,
  lockBranch,
}: EmployeeWizardFieldsProps) {
  const disabledProfile = !canEditProfile || saving || branchesLoading;
  const disabledRole = !canEditRole || saving;

  if (section === "profile") {
    return (
      <fieldset
        disabled={disabledProfile}
        className={cn("space-y-4", disabledProfile && "opacity-80")}
      >
        <legend className="sr-only">Datos personales</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel required={canEditProfile}>
              Cédula / documento
            </FieldLabel>
            <input
              type="text"
              required={canEditProfile}
              value={form.nationalId}
              onChange={(e) =>
                setForm((f) => ({ ...f, nationalId: e.target.value }))
              }
              className={inputClass}
            />
          </label>

          <label className="block">
            <FieldLabel required={canEditProfile}>Nombre</FieldLabel>
            <input
              type="text"
              required={canEditProfile}
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              className={inputClass}
            />
          </label>

          <label className="block">
            <FieldLabel required={canEditProfile}>Teléfono</FieldLabel>
            <input
              type="tel"
              required={canEditProfile}
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              className={inputClass}
            />
          </label>

          <label className="block">
            <FieldLabel required={canEditProfile}>Correo</FieldLabel>
            <input
              type="email"
              required={canEditProfile}
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className={inputClass}
            />
          </label>
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Asignación</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="block">
          <FieldLabel required={!lockBranch}>Sucursal</FieldLabel>
          {lockBranch ? (
            <p className="rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 text-sm text-muted">
              Sucursal de tu distribuidora (personal interno)
            </p>
          ) : (
            <BranchSelect
              value={form.branchId}
              onChange={(branchId) => setForm((f) => ({ ...f, branchId }))}
              branches={branches}
              companies={companies}
              loading={branchesLoading}
              disabled={disabledProfile || branches.length === 0}
            />
          )}
        </div>

        <label className="block">
          <FieldLabel required>Rol</FieldLabel>
          <select
            value={form.role}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                role: e.target.value as EmployeeUiRole,
              }))
            }
            disabled={disabledRole}
            className={inputClass}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {EMPLOYEE_UI_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </fieldset>
  );
}
