"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { CompanyResponse } from "@/types/company";

function companyLabel(company: CompanyResponse): string {
  const name = company.businessName?.trim();
  return name ? `${name} · ${company.rif}` : company.rif;
}

type CompanySelectProps = {
  value: string;
  onChange: (value: string) => void;
  companies: CompanyResponse[];
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
};

export function CompanySelect({
  value,
  onChange,
  companies,
  disabled,
  loading,
  required,
}: CompanySelectProps) {
  const options = useMemo(
    () =>
      companies.map((company) => ({
        value: String(company.id),
        label: companyLabel(company),
        searchText: `${company.id} ${company.rif} ${company.businessName ?? ""}`,
      })),
    [companies],
  );

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      loading={loading}
      required={required}
      emptyLabel={required ? "Selecciona una empresa" : "Sin empresa"}
      searchPlaceholder="Buscar empresa…"
      modalTitle="Seleccionar empresa"
    />
  );
}
