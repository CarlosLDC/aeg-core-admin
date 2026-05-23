"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";

export type PrinterSelectOption = {
  id: number;
  label: string;
};

type PrinterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: PrinterSelectOption[];
  disabled?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  searchPlaceholder?: string;
};

export function PrinterSelect({
  value,
  onChange,
  options,
  disabled,
  loading,
  emptyLabel = "Sin asignar",
  searchPlaceholder = "Buscar por serial o ID…",
}: PrinterSelectProps) {
  const searchableOptions = useMemo(
    () =>
      options.map((opt) => ({
        value: String(opt.id),
        label: opt.label,
        searchText: String(opt.id),
      })),
    [options],
  );

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={searchableOptions}
      disabled={disabled}
      loading={loading}
      emptyLabel={emptyLabel}
      searchPlaceholder={searchPlaceholder}
      modalTitle="Seleccionar impresora"
      mono
    />
  );
}
