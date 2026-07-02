"use client";

import { DistributorSelect } from "@/components/branches/distributor-select";
import { FieldLabel } from "@/components/ui/field-label";
import {
  BRANCH_OPERATIONAL_ROLE_OPTIONS,
  isFactoryCompany,
} from "@/lib/organization-roles";
import {
  BRANCH_ROLE_TOGGLE_TONE,
  toggleButtonClass,
} from "@/lib/toggle-button-styles";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { BranchOrganizationRole } from "@/types/organization";

export type BranchOperationalRoleFieldValues = {
  organizationRole: BranchOrganizationRole;
  isClient: boolean;
  clientDistributorId: string;
};

type BranchOperationalRoleFieldsProps = {
  values: BranchOperationalRoleFieldValues;
  onChange: (patch: Partial<BranchOperationalRoleFieldValues>) => void;
  disabled?: boolean;
  branches: BranchResponse[];
  distributors: DistributorResponse[];
  companies: CompanyResponse[];
  companyOrganizationType?: CompanyResponse["organizationType"];
  excludeBranchId?: number;
};

export function BranchOperationalRoleFields({
  values,
  onChange,
  disabled = false,
  branches,
  distributors,
  companies,
  companyOrganizationType,
  excludeBranchId,
}: BranchOperationalRoleFieldsProps) {
  const factoryCompany = isFactoryCompany(companyOrganizationType);
  const operationalDisabled = disabled || factoryCompany;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        El rol operativo es exclusivo: distribuidora o centro de servicio. Cliente
        es independiente y puede combinarse.
      </p>
      {factoryCompany ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Esta empresa es la fábrica (AEG): sus sucursales no pueden ser
          distribuidora ni centro de servicio.
        </p>
      ) : null}
      {values.organizationRole === "DISTRIBUTOR" ? (
        <p className="text-xs text-muted">
          Una distribuidora no puede registrarse como cliente de sí misma.
        </p>
      ) : null}
      <div className="space-y-2">
        <FieldLabel>Roles de la empresa</FieldLabel>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {BRANCH_OPERATIONAL_ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={values.organizationRole === option.value}
              disabled={operationalDisabled}
              onClick={() =>
                onChange({
                  organizationRole: option.value,
                  ...(option.value === "DISTRIBUTOR"
                    ? { isClient: false, clientDistributorId: "" }
                    : {}),
                })
              }
              className={toggleButtonClass(
                values.organizationRole === option.value,
                option.value === "SERVICE_CENTER"
                  ? BRANCH_ROLE_TOGGLE_TONE.isServiceCenter
                  : option.value === "DISTRIBUTOR"
                    ? BRANCH_ROLE_TOGGLE_TONE.isDistributor
                    : "slate",
                {
                  disabled: operationalDisabled,
                  className: "w-full justify-center",
                },
              )}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={values.isClient}
            disabled={disabled || values.organizationRole === "DISTRIBUTOR"}
            onClick={() =>
              onChange({
                isClient: !values.isClient,
                ...(values.isClient ? { clientDistributorId: "" } : {}),
              })
            }
            className={toggleButtonClass(
              values.isClient,
              BRANCH_ROLE_TOGGLE_TONE.isClient,
              { disabled, className: "w-full justify-center" },
            )}
          >
            Cliente
          </button>
        </div>
      </div>
      {values.isClient ? (
        <label className="block">
          <FieldLabel>Distribuidor del cliente</FieldLabel>
          <DistributorSelect
            value={values.clientDistributorId}
            onChange={(clientDistributorId) => onChange({ clientDistributorId })}
            distributors={distributors}
            branches={branches}
            companies={companies}
            excludeBranchId={excludeBranchId}
          />
        </label>
      ) : null}
    </div>
  );
}
