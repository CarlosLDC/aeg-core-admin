import type { SortDirection } from "@/lib/table-sort";
import { cn } from "@/lib/utils";

type SortableTableHeaderProps = {
  label: string;
  sortDirection: SortDirection | null;
  onToggle: () => void;
  className?: string;
};

export function SortableTableHeader({
  label,
  sortDirection,
  onToggle,
  className,
}: SortableTableHeaderProps) {
  const indicator = sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "↕";

  const ariaSort =
    sortDirection === "asc"
      ? "ascending"
      : sortDirection === "desc"
        ? "descending"
        : "none";

  return (
    <th className={cn("whitespace-nowrap px-5 py-3 font-medium", className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-sort={ariaSort}
        className="inline-flex items-center gap-1.5 text-left text-inherit transition-colors hover:text-card-foreground"
      >
        <span>{label}</span>
        <span aria-hidden>{indicator}</span>
      </button>
    </th>
  );
}
