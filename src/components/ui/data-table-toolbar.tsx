"use client";

import { useState } from "react";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FILTER_ALL } from "@/lib/table-filter-options";
import { cn } from "@/lib/utils";

export type FilterSelectOption = {
  value: string;
  label: string;
  searchText?: string;
};

export type FilterSelect = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  /** Desplegable con búsqueda (recomendado para listas largas, p. ej. empresas). */
  searchable?: boolean;
  searchPlaceholder?: string;
};

const searchInputClass =
  "w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-ring/20";

const nativeSelectClass =
  "w-full appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-9 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20";

type DataTableToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterSelect[];
  resultCount?: number;
  totalCount?: number;
  className?: string;
};

function countActiveFilters(filters: FilterSelect[], search: string): number {
  let count = filters.filter((f) => f.value !== FILTER_ALL).length;
  if (search.trim()) count += 1;
  return count;
}

function TableFilterField({ filter }: { filter: FilterSelect }) {
  const allOption = filter.options.find((o) => o.value === FILTER_ALL);
  const listOptions = filter.options.filter((o) => o.value !== FILTER_ALL);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{filter.label}</span>
      {filter.searchable ? (
        <SearchableSelect
          value={filter.value === FILTER_ALL ? "" : filter.value}
          onChange={(next) => filter.onChange(next === "" ? FILTER_ALL : next)}
          options={listOptions.map((o) => ({
            value: o.value,
            label: o.label,
            searchText: o.searchText,
          }))}
          emptyLabel={allOption?.label ?? "Todos"}
          searchPlaceholder={
            filter.searchPlaceholder ?? `Buscar ${filter.label.toLowerCase()}…`
          }
          modalTitle={filter.label}
        />
      ) : (
        <div className="relative">
          <select
            id={`filter-${filter.id}`}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className={nativeSelectClass}
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}

export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar…",
  filters = [],
  resultCount,
  totalCount,
  className,
}: DataTableToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCount = countActiveFilters(filters, search);
  const hasActiveFilters = activeCount > 0;

  const showCount =
    resultCount !== undefined &&
    totalCount !== undefined &&
    hasActiveFilters;

  function clearFilters() {
    onSearchChange("");
    for (const filter of filters) {
      if (filter.value !== FILTER_ALL) {
        filter.onChange(FILTER_ALL);
      }
    }
  }

  return (
    <div className={cn("border-b border-border", className)}>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar en la tabla</span>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={searchInputClass}
          />
        </label>

        {filters.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                filtersOpen || activeCount > 0
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border bg-card text-foreground hover:bg-foreground/5",
              )}
            >
              <Filter className="size-4" aria-hidden />
              Filtros
              {activeCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                  {activeCount}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
                Limpiar
              </button>
            )}
          </>
        )}
      </div>

      {filtersOpen && filters.length > 0 && (
        <div className="border-t border-border bg-foreground/[0.02] px-4 py-3 sm:px-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filters.map((filter) => (
              <TableFilterField key={filter.id} filter={filter} />
            ))}
          </div>
        </div>
      )}

      {showCount && (
        <p className="px-4 pb-3 text-xs text-muted sm:px-5">
          <span className="font-medium text-card-foreground">{resultCount}</span>
          {" "}resultado{resultCount !== 1 ? "s" : ""} de{" "}
          <span className="font-medium text-card-foreground">{totalCount}</span>
        </p>
      )}
    </div>
  );
}
