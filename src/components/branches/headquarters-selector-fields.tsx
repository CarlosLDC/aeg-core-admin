"use client";

import { BranchSelect } from "@/components/users/branch-select";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";

type HeadquartersSelectorFieldsProps = {
  companyId: number | null;
  mode: "new" | "existing";
  branchId: number | null;
  isHeadquarters?: boolean;
  branches: BranchResponse[];
  companies: CompanyResponse[];
  disabled?: boolean;
  onModeChange: (mode: "new" | "existing") => void;
  onBranchChange: (branchId: number | null) => void;
  onHeadquartersChange?: (value: boolean) => void;
};

export function HeadquartersSelectorFields({
  companyId,
  mode,
  branchId,
  isHeadquarters = true,
  branches,
  companies,
  disabled = false,
  onModeChange,
  onBranchChange,
  onHeadquartersChange,
}: HeadquartersSelectorFieldsProps) {
  const options =
    companyId == null
      ? []
      : branches.filter((branch) => branch.companyId === companyId);

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Casa matriz</legend>
      <p className="text-xs text-muted">
        Selecciona si la sucursal actual será la casa matriz o reutiliza una ya
        existente de esta empresa.
      </p>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="hqMode"
            checked={mode === "new"}
            onChange={() => onModeChange("new")}
            disabled={disabled}
            className="size-4 border-border accent-accent"
          />
          <span>Usar esta nueva sucursal como casa matriz</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="hqMode"
            checked={mode === "existing"}
            onChange={() => onModeChange("existing")}
            disabled={disabled || options.length === 0}
            className="size-4 border-border accent-accent"
          />
          <span>Seleccionar una casa matriz existente</span>
        </label>
      </div>
      {mode === "existing" && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            Sucursal casa matriz
          </span>
          <BranchSelect
            value={branchId != null ? String(branchId) : ""}
            onChange={(value) => onBranchChange(value ? Number(value) : null)}
            branches={options}
            companies={companies}
            disabled={disabled}
          />
        </label>
      )}
      {mode === "new" && onHeadquartersChange && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isHeadquarters}
            onChange={(e) => onHeadquartersChange(e.target.checked)}
            disabled={disabled}
            className="size-4 rounded border-border accent-accent"
          />
          <span>Marcar esta sucursal como casa matriz</span>
        </label>
      )}
    </fieldset>
  );
}
