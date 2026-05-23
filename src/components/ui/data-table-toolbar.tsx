"use client";

import { useState } from "react";
import {
  ChevronDown,
  Columns3,
  Filter,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
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

export type ColumnToggle = {
  id: string;
  label: string;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
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
  /** Toggles de columnas meta (creado el, editado el, etc.). */
  columns?: ColumnToggle[];
  resultCount?: number;
  totalCount?: number;
  className?: string;
};

function countActiveFilters(filters: FilterSelect[], search: string): number {
  let count = filters.filter((f) => f.value !== FILTER_ALL).length;
  if (search.trim()) count += 1;
  return count;
}

function countActiveFilterFields(filters: FilterSelect[]): number {
  return filters.filter((f) => f.value !== FILTER_ALL).length;
}

function countVisibleOptionalColumns(columns: ColumnToggle[]): number {
  return columns.filter((c) => c.visible).length;
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

function TableColumnsSection({ columns }: { columns: ColumnToggle[] }) {
  const visibleCount = countVisibleOptionalColumns(columns);

  function setAllColumnsVisible(visible: boolean) {
    for (const column of columns) {
      if (column.visible !== visible) {
        column.onVisibleChange(visible);
      }
    }
  }

  return (
    <section
      aria-labelledby="table-columns-heading"
      className="rounded-lg border border-border bg-card p-3 sm:p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3
          id="table-columns-heading"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted"
        >
          <Columns3 className="size-3.5" aria-hidden />
          Columnas visibles
        </h3>
        <span className="text-xs text-muted">
          {visibleCount} de {columns.length}
        </span>
      </div>

      <p className="mb-3 text-xs text-muted">
        Activa solo las columnas de soporte que quieras ver en la tabla.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAllColumnsVisible(true)}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          Mostrar todas
        </button>
        <button
          type="button"
          onClick={() => setAllColumnsVisible(false)}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          Ocultar todas
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {columns.map((column) => (
          <label
            key={column.id}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-card-foreground transition-colors hover:bg-foreground/[0.03]"
          >
            <input
              type="checkbox"
              checked={column.visible}
              onChange={(e) => column.onVisibleChange(e.target.checked)}
              className="size-4 rounded border-border text-accent focus:ring-2 focus:ring-ring/20"
            />
            {column.label}
          </label>
        ))}
      </div>
    </section>
  );
}

export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar…",
  filters = [],
  columns = [],
  resultCount,
  totalCount,
  className,
}: DataTableToolbarProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const activeCount = countActiveFilters(filters, search);
  const activeFilterFields = countActiveFilterFields(filters);
  const hasActiveFilters = activeCount > 0;
  const visibleOptionalColumns = countVisibleOptionalColumns(columns);
  const hasPanel = filters.length > 0 || columns.length > 0;

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

        {hasPanel && (
          <>
            <button
              type="button"
              onClick={() => setPanelOpen((open) => !open)}
              aria-expanded={panelOpen}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                panelOpen || activeCount > 0 || visibleOptionalColumns > 0
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border bg-card text-foreground hover:bg-foreground/5",
              )}
            >
              <Filter className="size-4" aria-hidden />
              Filtros
              {activeCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                  {activeFilterFields}
                </span>
              )}
            </button>

            {columns.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted">
                <Columns3 className="size-3.5" aria-hidden />
                {visibleOptionalColumns}/{columns.length}
              </span>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                {filters.length > 0 ? (
                  <X className="size-4" aria-hidden />
                ) : (
                  <RotateCcw className="size-4" aria-hidden />
                )}
                Limpiar filtros
              </button>
            )}
          </>
        )}
      </div>

      {panelOpen && hasPanel && (
        <div className="space-y-4 border-t border-border bg-foreground/[0.02] px-4 py-3 sm:px-5">
          {filters.length > 0 && (
            <section
              aria-labelledby="table-filters-heading"
              className="rounded-lg border border-border bg-card p-3 sm:p-4"
            >
              <h3
                id="table-filters-heading"
                className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted"
              >
                <Filter className="size-3.5" aria-hidden />
                Filtros de datos
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filters.map((filter) => (
                  <TableFilterField key={filter.id} filter={filter} />
                ))}
              </div>
            </section>
          )}
          {columns.length > 0 && (
            <TableColumnsSection columns={columns} />
          )}
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
