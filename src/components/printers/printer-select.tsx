"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";

export type PrinterSelectOption = {
  id: number;
  label: string;
  /** Serial fiscal; útil para mostrar en tablas sin el ID. */
  serial?: string;
  /** Texto extra para filtrar (p. ej. MAC). */
  searchText?: string;
};

type PrinterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: PrinterSelectOption[];
  disabled?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  searchPlaceholder?: string;
  preloadOptions?: boolean;
  required?: boolean;
};

export function PrinterSelect({
  value,
  onChange,
  options,
  disabled,
  loading,
  emptyLabel = "Sin asignar",
  searchPlaceholder = "Buscar por serial o ID…",
  preloadOptions = false,
  required,
}: PrinterSelectProps) {
  const searchableOptions = useMemo(
    () =>
      options.map((opt) => ({
        value: String(opt.id),
        label: opt.label,
        searchText:
          opt.searchText ??
          `${opt.id} ${opt.serial ?? ""} ${opt.label}`,
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
      preloadOptions={preloadOptions}
      required={required}
    />
  );
}
