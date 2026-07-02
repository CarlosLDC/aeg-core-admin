"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { distributorLabel } from "@/lib/branch-roles";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";

type DistributorSelectProps = {
  value: string;
  onChange: (value: string) => void;
  distributors: DistributorResponse[];
  branches: BranchResponse[];
  companies: CompanyResponse[];
  disabled?: boolean;
  excludeBranchId?: number;
  emptyLabel?: string;
  searchPlaceholder?: string;
  modalTitle?: string;
};

export function DistributorSelect({
  value,
  onChange,
  distributors,
  branches,
  companies,
  disabled,
  excludeBranchId,
  emptyLabel = "Sin distribuidor",
  searchPlaceholder = "Buscar distribuidor…",
  modalTitle = "Seleccionar distribuidor",
}: DistributorSelectProps) {
  const options = useMemo(
    () =>
      distributors
        .filter((d) => d.branchId !== excludeBranchId)
        .map((distributor) => ({
          value: String(distributor.id),
          label: distributorLabel(distributor, branches, companies),
          searchText: String(distributor.id),
        })),
    [distributors, branches, companies, excludeBranchId],
  );

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      emptyLabel={emptyLabel}
      searchPlaceholder={searchPlaceholder}
      modalTitle={modalTitle}
    />
  );
}
