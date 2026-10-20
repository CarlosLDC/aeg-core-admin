"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SealColorBadge } from "@/components/seals/seal-color-badge";
import { SEAL_COLOR_LABELS } from "@/lib/seal-form";
import type { SealResponse } from "@/types/seal";

export type SealSelectProps = {
  value: string;
  onChange: (value: string) => void;
  seals: SealResponse[];
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  emptyLabel?: string;
  searchPlaceholder?: string;
  modalTitle?: string;
  preloadOptions?: boolean;
};

export function sealToSearchableOption(seal: SealResponse) {
  const colorLabel = SEAL_COLOR_LABELS[seal.color] ?? seal.color;
  return {
    value: String(seal.id),
    label: seal.serial,
    description: `ID #${seal.id}`,
    searchText: `${seal.serial} ${colorLabel} ${seal.color} ${seal.id}`,
  };
}

export function SealSelect({
  value,
  onChange,
  seals,
  disabled,
  loading,
  required = true,
  emptyLabel = "Seleccionar precinto disponible…",
  searchPlaceholder = "Buscar por serial, color o ID…",
  modalTitle = "Seleccionar precinto disponible",
  preloadOptions = true,
}: SealSelectProps) {
  const options = useMemo(
    () =>
      seals.map((seal) => {
        const base = sealToSearchableOption(seal);
        return {
          ...base,
          badge: <SealColorBadge color={seal.color} />,
        };
      }),
    [seals],
  );

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      loading={loading}
      required={required}
      emptyLabel={emptyLabel}
      searchPlaceholder={searchPlaceholder}
      modalTitle={modalTitle}
      preloadOptions={preloadOptions}
      mono
    />
  );
}
