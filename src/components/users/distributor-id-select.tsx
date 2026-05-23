"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { distributorLabel } from "@/lib/branch-roles";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";

type DistributorIdSelectProps = {
  value: string;
  onChange: (value: string) => void;
  distributors: DistributorResponse[];
  branches: BranchResponse[];
  companies: CompanyResponse[];
  loading?: boolean;
  disabled?: boolean;
  required?: boolean;
};

export function DistributorIdSelect({
  value,
  onChange,
  distributors,
  branches,
  companies,
  loading,
  disabled,
  required,
}: DistributorIdSelectProps) {
  const options = useMemo(
    () =>
      distributors.map((distributor) => ({
        value: String(distributor.id),
        label: distributorLabel(distributor, branches, companies),
        searchText: `${distributor.id} ${distributorLabel(distributor, branches, companies)}`,
      })),
    [distributors, branches, companies],
  );

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      loading={loading}
      required={required}
      emptyLabel="Seleccionar distribuidor"
      searchPlaceholder="Buscar por ID o sucursal…"
      modalTitle="Seleccionar distribuidor"
    />
  );
}
