"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { SearchablePickerModal } from "@/components/ui/searchable-picker-modal";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  /** Texto extra para filtrar (p. ej. dirección, serial) */
  searchText?: string;
  /** Línea secundaria bajo la etiqueta principal */
  description?: string;
};

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  disabled?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  searchPlaceholder?: string;
  modalTitle?: string;
  required?: boolean;
  mono?: boolean;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  disabled,
  loading,
  emptyLabel = "Sin seleccionar",
  searchPlaceholder = "Buscar…",
  modalTitle,
  required,
  mono,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((opt) => opt.value === value);

  const queryTrimmed = query.trim();
  const hasSearchQuery = queryTrimmed.length > 0;

  const filtered = useMemo(() => {
    if (!hasSearchQuery) return [];
    const q = queryTrimmed.toLowerCase();
    return options.filter((opt) => {
      const haystack = `${opt.value} ${opt.label} ${opt.searchText ?? ""} ${opt.description ?? ""}`
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [options, queryTrimmed, hasSearchQuery]);

  function openPicker() {
    if (disabled || loading) return;
    setQuery("");
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
    setQuery("");
  }

  function pick(next: string) {
    onChange(next);
    closePicker();
  }

  const triggerLabel = loading
    ? "Cargando…"
    : value === ""
      ? emptyLabel
      : selected
        ? selected.label
        : `#${value}`;

  const showClear = !required;
  const pickerTitle = modalTitle ?? searchPlaceholder.replace(/…$/, "");

  return (
    <>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm outline-none transition-shadow",
          "focus:border-accent focus:ring-2 focus:ring-ring/20",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <span className={cn("min-w-0 truncate", mono && "font-mono")}>
          {triggerLabel}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted" />
      </button>

      <SearchablePickerModal
        open={open}
        onClose={closePicker}
        title={pickerTitle}
        searchPlaceholder={searchPlaceholder}
        query={query}
        onQueryChange={setQuery}
      >
        <ul role="listbox" className="py-1">
          {showClear && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                onClick={() => pick("")}
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-foreground/5"
              >
                <span className="text-muted">{emptyLabel}</span>
                {value === "" && (
                  <Check className="size-4 shrink-0 text-accent" />
                )}
              </button>
            </li>
          )}
          {!hasSearchQuery ? (
            <li className="px-4 py-6 text-center text-sm text-muted">
              Escribe en el buscador para ver opciones.
            </li>
          ) : filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted">
              Sin resultados
            </li>
          ) : (
            filtered.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => pick(opt.value)}
                    className="flex w-full items-start justify-between gap-2 px-4 py-2.5 text-left hover:bg-foreground/5"
                  >
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block truncate text-sm text-card-foreground",
                          mono && "font-mono",
                        )}
                      >
                        {opt.label}
                      </span>
                      {opt.description && (
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {opt.description}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </SearchablePickerModal>
    </>
  );
}
