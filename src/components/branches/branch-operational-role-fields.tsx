"use client";

import { Check } from "lucide-react";
import { DistributorSelect } from "@/components/branches/distributor-select";
import { FieldLabel } from "@/components/ui/field-label";
import { isFactoryCompany } from "@/lib/organization-roles";
import { toggleButtonClass } from "@/lib/toggle-button-styles";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { BranchOrganizationRole } from "@/types/organization";
import { cn } from "@/lib/utils";

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

const OPERATIONAL_OPTIONS: {
  value: BranchOrganizationRole;
  label: string;
  activeClass: string;
  dotClass: string;
}[] = [
  {
    value: "NONE",
    label: "Ninguno",
    activeClass:
      "border-slate-500/35 bg-slate-500/10 text-card-foreground",
    dotClass: "border-slate-600 bg-slate-600 dark:border-slate-300 dark:bg-slate-300",
  },
  {
    value: "DISTRIBUTOR",
    label: "Distribuidora",
    activeClass:
      "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dotClass: "border-rose-500 bg-rose-500",
  },
  {
    value: "SERVICE_CENTER",
    label: "Centro de servicio",
    activeClass:
      "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dotClass: "border-amber-500 bg-amber-500",
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

  function handleOperationalRoleSelect(role: BranchOrganizationRole) {
    onChange({
      organizationRole: role,
      ...(role === "DISTRIBUTOR" ? { canWriteAnnualInspection: true } : {}),
    });
  }

  const isDistributor = values.organizationRole === "DISTRIBUTOR";

  return (
    <div className="space-y-4">
      {factoryCompany ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Empresa fábrica (AEG): solo puede operar como distribuidora.
        </p>
      ) : null}

      {/* 1. Rol operativo (selección única / radio) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <FieldLabel className="mb-0">Rol operativo</FieldLabel>
          <span className="text-xs text-muted">Selección única</span>
        </div>

        <div
          role="radiogroup"
          aria-label="Rol operativo"
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {OPERATIONAL_OPTIONS.map((option) => {
            const selected = values.organizationRole === option.value;
            const isOptionDisabled =
              disabled ||
              (factoryCompany && option.value === "SERVICE_CENTER");

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={isOptionDisabled}
                onClick={() => handleOperationalRoleSelect(option.value)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  selected
                    ? option.activeClass
                    : "border-border bg-background text-muted hover:bg-foreground/5 hover:text-card-foreground",
                  isOptionDisabled && "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                    selected ? option.dotClass : "border-muted-foreground/40",
                  )}
                >
                  {selected ? (
                    <span className="size-1.5 rounded-full bg-white dark:bg-background" />
                  ) : null}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>

        {isDistributor ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-card-foreground">
                Inspecciones anuales
              </p>
              <p className="text-[11px] text-muted">
                Permite registrar inspecciones anuales obligatorias.
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
                { disabled, className: "shrink-0 py-1.5 text-xs" },
              )}
            >
              {values.canWriteAnnualInspection ? "Permitido" : "No permitido"}
            </button>
          </div>
        ) : null}
      </div>

      {/* 2. Rol comercial (combinable / checkbox) */}
      <div className="space-y-2.5 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <FieldLabel className="mb-0">Rol adicional</FieldLabel>
          <span className="text-xs text-muted">Combinable</span>
        </div>

        <button
          type="button"
          role="checkbox"
          aria-checked={values.isClient}
          disabled={disabled || factoryCompany}
          onClick={handleClientToggle}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
            values.isClient
              ? "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300"
              : "border-border bg-background text-muted hover:bg-foreground/5 hover:text-card-foreground",
            (disabled || factoryCompany) && "cursor-not-allowed opacity-50",
          )}
        >
          <span className="flex items-center gap-2.5 text-sm font-medium">
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                values.isClient
                  ? "border-sky-500 bg-sky-500 text-white"
                  : "border-muted-foreground/40 bg-background",
              )}
            >
              {values.isClient ? <Check className="size-3 stroke-[3]" /> : null}
            </span>
            Cliente
          </span>
          <span className="text-xs text-muted">
            Posee impresoras fiscales asignadas
          </span>
        </button>

        {values.isClient ? (
          <label className="block space-y-1.5 pt-1">
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
        ) : null}
      </div>
    </div>
  );
}
