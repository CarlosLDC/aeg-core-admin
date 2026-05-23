import type { SortDirection } from "@/lib/table-sort";
import { cn } from "@/lib/utils";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";

export function TableIdHeader({
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
        label="ID"
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
      ID
    </th>
  );
}

export function TableIdCell({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-5 py-3.5 font-mono text-sm text-muted",
        className,
      )}
    >
      {value}
    </td>
  );
}
