import { formatDate } from "@/lib/datetime-form";
import { cn } from "@/lib/utils";

export function TableCreatedAtHeader({ className }: { className?: string }) {
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
