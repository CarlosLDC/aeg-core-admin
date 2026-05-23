"use client";

import { DistributorSelect } from "@/components/branches/distributor-select";
import { FieldLabel } from "@/components/ui/field-label";
import { HeadquartersSelectorFields } from "@/components/branches/headquarters-selector-fields";
import type { BranchWizardValues } from "@/components/branches/branch-wizard-types";
import {
  BRANCH_ROLE_TOGGLE_TONE,
  toggleButtonClass,
} from "@/lib/toggle-button-styles";
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
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["isDistributor", "Distribuidor"],
            ["isClient", "Cliente"],
            ["isServiceCenter", "Centro de servicio"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={form[key]}
            disabled={saving}
            onClick={() =>
              setForm((f) => ({
                ...f,
                [key]: !f[key],
                ...(key === "isClient" && f[key]
                  ? { clientDistributorId: "" }
                  : {}),
              }))
            }
            className={toggleButtonClass(form[key], BRANCH_ROLE_TOGGLE_TONE[key], {
              disabled: saving,
            })}
          >
            {label}
          </button>
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
