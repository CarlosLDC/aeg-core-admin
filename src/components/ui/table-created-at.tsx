import { formatDate } from "@/lib/datetime-form";
import type { SortDirection } from "@/lib/table-sort";
import { cn } from "@/lib/utils";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";

export function TableCreatedAtHeader({
  className,
  sortDirection = null,
  onSortToggle,
}: {
  className?: string;
  sortDirection?: SortDirection | null;
  onSortToggle?: () => void;
}) {
  if (onSortToggle) {
    return (
      <SortableTableHeader
        label="Creado el"
        sortDirection={sortDirection}
        onToggle={onSortToggle}
        className={className}
      />
    );
  }

  return (
    <th
      className={cn(
        "whitespace-nowrap px-5 py-3 font-medium",
        className,
      )}
    >
      Creado el
    </th>
  );
}

export function TableCreatedAtCell({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-5 py-0 text-muted",
        className,
      )}
    >
      {formatDate(value)}
    </td>
  );
}
