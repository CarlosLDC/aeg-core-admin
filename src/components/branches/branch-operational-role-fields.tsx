"use client";

import { DistributorSelect } from "@/components/branches/distributor-select";
import { FieldLabel } from "@/components/ui/field-label";
import { isFactoryCompany } from "@/lib/organization-roles";
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
  canWriteAnnualInspection: boolean;
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

const OPERATIONAL_ROLE_BUTTONS: {
  value: Exclude<BranchOrganizationRole, "NONE">;
  label: string;
  tone: (typeof BRANCH_ROLE_TOGGLE_TONE)["isDistributor" | "isServiceCenter"];
}[] = [
  {
    value: "DISTRIBUTOR",
    label: "Distribuidora",
    tone: BRANCH_ROLE_TOGGLE_TONE.isDistributor,
  },
  {
    value: "SERVICE_CENTER",
    label: "Centro de servicio",
    tone: BRANCH_ROLE_TOGGLE_TONE.isServiceCenter,
  },
];

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

  function handleClientToggle() {
    const nextIsClient = !values.isClient;
    let nextClientDistributorId = values.clientDistributorId;
    if (
      nextIsClient &&
      !nextClientDistributorId &&
      values.organizationRole === "DISTRIBUTOR" &&
      excludeBranchId != null
    ) {
      const selfDist = distributors.find((d) => d.branchId === excludeBranchId);
      if (selfDist) {
        nextClientDistributorId = String(selfDist.id);
      }
    } else if (!nextIsClient) {
      nextClientDistributorId = "";
    }
    onChange({
      isClient: nextIsClient,
      clientDistributorId: nextClientDistributorId,
    });
  }

  function handleOperationalRoleToggle(
    role: Exclude<BranchOrganizationRole, "NONE">,
  ) {
    const isAlreadyActive = values.organizationRole === role;
    const nextRole: BranchOrganizationRole = isAlreadyActive ? "NONE" : role;
    onChange({
      organizationRole: nextRole,
      ...(nextRole === "DISTRIBUTOR"
        ? { canWriteAnnualInspection: true }
        : {}),
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <FieldLabel>Selecciona los roles de la empresa</FieldLabel>
        <p className="text-xs text-muted">
          Puedes marcar <strong>Cliente</strong> junto con un rol operativo (
          <strong>Distribuidora</strong> o <strong>Centro de servicio</strong>,
          mutuamente excluyentes). Haz clic de nuevo sobre un rol activo para
          quitarlo.
        </p>
        {factoryCompany ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Esta empresa es la fábrica (AEG): sus sucursales pueden operar como
            distribuidora, pero no como centro de servicio ni cliente.
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            aria-pressed={values.isClient}
            disabled={disabled || factoryCompany}
            onClick={handleClientToggle}
            className={toggleButtonClass(
              values.isClient,
              BRANCH_ROLE_TOGGLE_TONE.isClient,
              {
                disabled: disabled || factoryCompany,
                className: "w-full justify-center py-2.5",
              },
            )}
          >
            Cliente
          </button>

          {OPERATIONAL_ROLE_BUTTONS.map((option) => {
            const isActive = values.organizationRole === option.value;
            const isOptionDisabled =
              disabled ||
              (factoryCompany && option.value === "SERVICE_CENTER");
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                disabled={isOptionDisabled}
                onClick={() => handleOperationalRoleToggle(option.value)}
                className={toggleButtonClass(isActive, option.tone, {
                  disabled: isOptionDisabled,
                  className: "w-full justify-center py-2.5",
                })}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {values.isClient ? (
        <div className="rounded-lg border border-border bg-foreground/[0.02] p-3.5">
          <label className="block space-y-1.5">
            <FieldLabel>Distribuidor del cliente</FieldLabel>
            <DistributorSelect
              value={values.clientDistributorId}
              onChange={(clientDistributorId) =>
                onChange({ clientDistributorId })
              }
              distributors={distributors}
              branches={branches}
              companies={companies}
              excludeBranchId={
                values.organizationRole === "DISTRIBUTOR"
                  ? undefined
                  : excludeBranchId
              }
            />
          </label>
        </div>
      ) : null}

      {values.organizationRole === "DISTRIBUTOR" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-foreground/[0.02] p-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-card-foreground">
              Inspecciones anuales
            </p>
            <p className="text-xs text-muted">
              Permite a los usuarios de esta distribuidora crear inspecciones
              anuales obligatorias.
            </p>
          </div>
          <button
            type="button"
            aria-pressed={values.canWriteAnnualInspection}
            disabled={disabled}
            onClick={() =>
              onChange({
                canWriteAnnualInspection: !values.canWriteAnnualInspection,
              })
            }
            className={toggleButtonClass(
              values.canWriteAnnualInspection,
              "emerald",
              { disabled, className: "shrink-0" },
            )}
          >
            {values.canWriteAnnualInspection ? "Permitido" : "No permitido"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
