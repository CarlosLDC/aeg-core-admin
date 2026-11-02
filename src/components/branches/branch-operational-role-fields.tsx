"use client";

import { Check, CheckSquare, Square, Wrench, Truck, UserCheck } from "lucide-react";
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
  const isServiceCenter = values.organizationRole === "SERVICE_CENTER";
  const isNone = values.organizationRole === "NONE";

  return (
    <div className="space-y-4">
      {factoryCompany ? (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Esta empresa es la fábrica (AEG): sus sucursales operan como
          distribuidora y no pueden ser centro de servicio ni cliente.
        </p>
      ) : null}

      {/* SECCIÓN 1: ROL OPERATIVO (EXCLUSIVO) */}
      <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
          <FieldLabel className="font-semibold text-card-foreground">
            1. Rol operativo de la empresa
          </FieldLabel>
          <span className="text-[11px] font-medium text-muted uppercase tracking-wider">
            Excluyente (Solo 1 opción)
          </span>
        </div>
        <p className="text-xs text-muted">
          Una empresa solo puede actuar como distribuidora o como centro de
          servicio (no ambos). Si es solo cliente final, selecciona &ldquo;Sin rol operativo&rdquo;.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {/* Opción: Sin rol operativo */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleOperationalRoleSelect("NONE")}
            className={cn(
              "relative flex flex-col justify-between rounded-lg border p-3 text-left transition-all",
              isNone
                ? "border-accent/40 bg-accent/5 ring-1 ring-accent/30"
                : "border-border bg-background hover:border-border/80 hover:bg-muted/10",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-card-foreground">
                Sin rol operativo
              </span>
              <div
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isNone
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-muted-foreground/30",
                )}
              >
                {isNone ? <div className="size-1.5 rounded-full bg-white" /> : null}
              </div>
            </div>
            <p className="mt-1 text-[11px] text-muted leading-snug">
              Para clientes comerciales estándar que no prestan servicio ni distribuyen.
            </p>
          </button>

          {/* Opción: Distribuidora */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleOperationalRoleSelect("DISTRIBUTOR")}
            className={cn(
              "relative flex flex-col justify-between rounded-lg border p-3 text-left transition-all",
              isDistributor
                ? "border-rose-500/40 bg-rose-500/5 ring-1 ring-rose-500/30 text-rose-700 dark:text-rose-300"
                : "border-border bg-background hover:border-border/80 hover:bg-muted/10",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Truck className="size-3.5" />
                Distribuidora
              </span>
              <div
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isDistributor
                    ? "border-rose-500 bg-rose-500 text-white"
                    : "border-muted-foreground/30",
                )}
              >
                {isDistributor ? <div className="size-1.5 rounded-full bg-white" /> : null}
              </div>
            </div>
            <p className="mt-1 text-[11px] text-muted leading-snug">
              Comercializa impresoras y gestiona clientes y técnicos.
            </p>
          </button>

          {/* Opción: Centro de servicio */}
          <button
            type="button"
            disabled={disabled || factoryCompany}
            onClick={() => handleOperationalRoleSelect("SERVICE_CENTER")}
            className={cn(
              "relative flex flex-col justify-between rounded-lg border p-3 text-left transition-all",
              isServiceCenter
                ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/30 text-amber-700 dark:text-amber-300"
                : "border-border bg-background hover:border-border/80 hover:bg-muted/10",
              (disabled || factoryCompany) && "cursor-not-allowed opacity-50",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <Wrench className="size-3.5" />
                Centro de servicio
              </span>
              <div
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isServiceCenter
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-muted-foreground/30",
                )}
              >
                {isServiceCenter ? <div className="size-1.5 rounded-full bg-white" /> : null}
              </div>
            </div>
            <p className="mt-1 text-[11px] text-muted leading-snug">
              Presta soporte técnico oficial, reparaciones y mantenimiento fiscal.
            </p>
          </button>
        </div>

        {/* Configuración adicional de distribuidora */}
        {isDistributor ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.03] p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-card-foreground">
                Inspecciones anuales
              </p>
              <p className="text-[11px] text-muted">
                Habilita a los usuarios de esta distribuidora para emitir actas de inspección anual.
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
                { disabled, className: "shrink-0 text-xs py-1.5" },
              )}
            >
              {values.canWriteAnnualInspection ? "Permitido" : "No permitido"}
            </button>
          </div>
        ) : null}
      </div>

      {/* SECCIÓN 2: ROL DE CLIENTE (COMPATIBLE/COMBINABLE) */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
          <FieldLabel className="font-semibold text-card-foreground">
            2. Condición de Cliente
          </FieldLabel>
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Combinable con cualquier rol operativo
          </span>
        </div>
        <p className="text-xs text-muted">
          Marca esta opción si la empresa adquiere equipos fiscales y posee impresoras a su nombre.
        </p>

        <button
          type="button"
          disabled={disabled || factoryCompany}
          onClick={handleClientToggle}
          className={cn(
            "flex w-full items-start gap-3 rounded-lg border p-3.5 text-left transition-all",
            values.isClient
              ? "border-sky-500/40 bg-sky-500/5 ring-1 ring-sky-500/30 text-sky-800 dark:text-sky-200"
              : "border-border bg-background hover:border-border/80 hover:bg-muted/10",
            (disabled || factoryCompany) && "cursor-not-allowed opacity-50",
          )}
        >
          <div
            className={cn(
              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
              values.isClient
                ? "border-sky-500 bg-sky-500 text-white"
                : "border-muted-foreground/40 bg-background",
            )}
          >
            {values.isClient ? <Check className="size-3 stroke-[3]" /> : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                Registrar como Cliente comercial
              </span>
              {values.isClient ? (
                <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                  Activo
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {values.organizationRole !== "NONE"
                ? `Esta empresa será a la vez ${
                    isDistributor ? "Distribuidora" : "Centro de servicio"
                  } y Cliente con su propio inventario de impresoras.`
                : "La empresa figurará en el catálogo de clientes fiscales del sistema."}
            </p>
          </div>
        </button>

        {values.isClient ? (
          <div className="rounded-lg border border-border bg-foreground/[0.02] p-3.5">
            <label className="block space-y-1.5">
              <FieldLabel required>Distribuidor asignado al cliente</FieldLabel>
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
              <p className="text-[11px] text-muted">
                Distribuidora encargada de la venta y control fiscal de sus equipos.
              </p>
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
