import { formatDate } from "@/lib/datetime-form";
import { cn } from "@/lib/utils";

export function TableUpdatedAtHeader({ className }: { className?: string }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-5 py-3 font-medium",
        className,
      )}
    >
      Editado el
    </th>
  );
}

export function TableUpdatedAtCell({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-5 py-0 text-muted",
        className,
      )}
    >
      {value ? formatDate(value) : "—"}
    </td>
  );
}
