"use client";

import { useEffect, useId, useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { cn } from "@/lib/utils";

type PrinterActionPickerPanelProps = {
  label: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  options: SelectOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  loading?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
  noResultsMessage?: string;
};

export function PrinterActionPickerPanel({
  label,
  searchPlaceholder,
  query,
  onQueryChange,
  options,
  selectedValue,
  onSelect,
  loading = false,
  disabled = false,
  emptyMessage = "Sin opciones disponibles",
  noResultsMessage = "Sin resultados",
}: PrinterActionPickerPanelProps) {
  const listboxId = useId();
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedLabel =
    options.find((opt) => String(opt.id) === selectedValue)?.label ?? null;

  useEffect(() => {
    if (disabled || loading) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [disabled, loading]);

  return (
    <div
      className={cn(
        "flex min-h-[min(18rem,50vh)] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm",
        "ring-2 ring-accent/25",
      )}
      aria-label={label}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-foreground/[0.03] px-3 py-2.5">
        <span className="text-sm font-semibold text-card-foreground">{label}</span>
        {selectedLabel ? (
          <span className="max-w-[55%] truncate text-xs text-muted">
            {selectedLabel}
          </span>
        ) : (
          <span className="text-xs text-muted">Selecciona una opción</span>
        )}
      </div>

      <div className="shrink-0 border-b border-border p-3">
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          disabled={disabled || loading}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20 disabled:opacity-60"
        />
      </div>

      <div
        id={listboxId}
        role="listbox"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
      >
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            Cargando opciones…
          </div>
        ) : options.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            {query.trim() ? noResultsMessage : emptyMessage}
          </p>
        ) : (
          options.map((opt) => {
            const value = String(opt.id);
            const isSelected = value === selectedValue;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => onSelect(value)}
                disabled={disabled}
                className={cn(
                  "flex w-full items-start justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-foreground/5 disabled:opacity-60",
                  isSelected && "bg-accent/10",
                )}
              >
                <span className="min-w-0 truncate text-card-foreground">
                  {opt.label}
                </span>
                {isSelected ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
