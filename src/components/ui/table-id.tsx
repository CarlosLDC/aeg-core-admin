import { cn } from "@/lib/utils";

export function TableIdHeader({ className }: { className?: string }) {
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
