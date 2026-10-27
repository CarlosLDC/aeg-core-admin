"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  branchSearchText,
  companyRifById,
  formatBranchShort,
} from "@/lib/branches";
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
      branches.map((branch) => {
        const rif = companyRifById(companies, branch.companyId);
        const descParts = [
          rif ? `RIF: ${rif}` : null,
          branch.address?.trim(),
        ].filter(Boolean);
        return {
          value: String(branch.id),
          label: formatBranchShort(branch, companies),
          searchText: branchSearchText(branch, companies),
          description:
            descParts.length > 0 ? descParts.join(" · ") : undefined,
        };
      }),
    [branches, companies],
  );

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      loading={loading}
      emptyLabel="Sin empresa"
      searchPlaceholder="Buscar empresa o RIF…"
      modalTitle="Seleccionar empresa"
    />
  );
}
