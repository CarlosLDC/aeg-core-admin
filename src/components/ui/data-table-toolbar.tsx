import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterSelect = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
};

type DataTableToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterSelect[];
  resultCount?: number;
  totalCount?: number;
  className?: string;
};

export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar…",
  filters = [],
  resultCount,
  totalCount,
  className,
}: DataTableToolbarProps) {
  const showCount =
    resultCount !== undefined &&
    totalCount !== undefined &&
    (search.trim() !== "" ||
      filters.some((f) => f.value !== "all"));

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border px-3 py-3 sm:px-5 sm:py-4",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20"
          />
        </label>
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <label
                key={filter.id}
                className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted sm:flex-none sm:flex-row sm:items-center sm:gap-2"
              >
                <span className="whitespace-nowrap">{filter.label}</span>
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-ring/30 sm:w-auto"
                >
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
      </div>
      {showCount && (
        <p className="text-xs text-muted">
          {resultCount} resultado{resultCount !== 1 ? "s" : ""} de {totalCount}
        </p>
      )}
    </div>
  );
}
