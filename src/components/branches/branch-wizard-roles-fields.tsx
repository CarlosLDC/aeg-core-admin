"use client";

import { DistributorSelect } from "@/components/branches/distributor-select";
import { FieldLabel } from "@/components/ui/field-label";
import { HeadquartersSelectorFields } from "@/components/branches/headquarters-selector-fields";
import type { BranchWizardValues } from "@/components/branches/branch-wizard-types";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";

type BranchWizardRolesFieldsProps = {
  form: BranchWizardValues;
  setForm: React.Dispatch<React.SetStateAction<BranchWizardValues>>;
  saving: boolean;
  branches: BranchResponse[];
  distributors: DistributorResponse[];
  companies: CompanyResponse[];
};

export function BranchWizardRolesFields({
  form,
  setForm,
  saving,
  branches,
  distributors,
  companies,
}: BranchWizardRolesFieldsProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Roles de sucursal</legend>
      <HeadquartersSelectorFields
        isHeadquarters={form.isHeadquarters}
        disabled={saving}
        onChange={(value) =>
          setForm((f) => ({
            ...f,
            isHeadquarters: value,
          }))
        }
      />
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
        <label className="block">
          <FieldLabel>Distribuidor del cliente</FieldLabel>
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
  );
}
