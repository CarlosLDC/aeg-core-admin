import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterSelect = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** Ocupa dos columnas en rejillas amplias (p. ej. empresa con nombres largos). */
  wide?: boolean;
};

const searchInputClass =
  "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-ring/20";

const selectClass =
  "w-full appearance-none rounded-lg border border-border bg-background py-2.5 pl-3 pr-9 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20";

type DataTableToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterSelect[];
  resultCount?: number;
  totalCount?: number;
  className?: string;
};

function filterGridClass(count: number): string {
  if (count <= 1) {
    return "grid-cols-1 sm:max-w-xs";
  }
  if (count === 2) {
    return "grid-cols-2";
  }
  if (count === 3) {
    return "grid-cols-2 lg:grid-cols-3";
  }
  return "grid-cols-2 lg:grid-cols-4";
}

function TableFilterField({ filter }: { filter: FilterSelect }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1.5",
        filter.wide && "sm:col-span-2 lg:col-span-2",
      )}
    >
      <label
        htmlFor={`filter-${filter.id}`}
        className="text-xs font-medium text-muted"
      >
        {filter.label}
      </label>
      <div className="relative min-w-[10.5rem]">
        <select
          id={`filter-${filter.id}`}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className={selectClass}
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
  const hasActiveFilters =
    search.trim() !== "" || filters.some((f) => f.value !== "all");

  const showCount =
    resultCount !== undefined &&
    totalCount !== undefined &&
    hasActiveFilters;

  return (
    <div
      className={cn(
        "border-b border-border bg-foreground/[0.01] px-4 py-4 sm:px-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:gap-6">
        <label className="relative block min-w-0 w-full 2xl:min-w-[16rem] 2xl:flex-1 2xl:max-w-2xl">
          <span className="sr-only">Buscar</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
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
          <div
            className={cn(
              "grid w-full min-w-0 gap-3 sm:gap-4 2xl:w-auto 2xl:shrink-0",
              filterGridClass(filters.length),
            )}
          >
            {filters.map((filter) => (
              <TableFilterField key={filter.id} filter={filter} />
            ))}
          </div>
        )}
      </div>

      {showCount && (
        <p className="mt-4 text-xs text-muted">
          <span className="font-medium text-card-foreground">{resultCount}</span>
          {" "}resultado{resultCount !== 1 ? "s" : ""} de{" "}
          <span className="font-medium text-card-foreground">{totalCount}</span>
        </p>
      )}
    </div>
  );
}
