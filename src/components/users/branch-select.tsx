"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatBranchLabel, formatBranchShort } from "@/lib/branches";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";

type BranchSelectProps = {
  value: string;
  onChange: (value: string) => void;
  branches: BranchResponse[];
  companies: CompanyResponse[];
  disabled?: boolean;
  loading?: boolean;
};

export function BranchSelect({
  value,
  onChange,
  branches,
  companies,
  disabled,
  loading,
}: BranchSelectProps) {
  const options = useMemo(
    () =>
      branches.map((branch) => ({
        value: String(branch.id),
        label: formatBranchShort(branch, companies),
        searchText: `${branch.id} ${formatBranchLabel(branch, companies)}`,
        description: branch.address?.trim() || undefined,
      })),
    [branches, companies],
  );

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      loading={loading}
      emptyLabel="Sin sucursal"
      searchPlaceholder="Buscar sucursal…"
      modalTitle="Seleccionar sucursal"
    />
  );
}
