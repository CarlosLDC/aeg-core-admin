import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const tableActionsHeaderClass = cn(
  "sticky right-0 z-20 min-w-[5.5rem]",
  "bg-foreground/[0.02] px-5 py-3 font-medium text-right",
  "shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.06)]",
  "dark:shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.28)]",
);

export const tableActionsCellClass = cn(
  "sticky right-0 z-10 min-w-[5.5rem] bg-card px-5 py-3.5",
  "shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.06)]",
  "group-hover:bg-foreground/[0.04]",
  "dark:shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.28)]",
);

export function TableActionsHeader() {
  return <th className={tableActionsHeaderClass}>Acciones</th>;
}

type TableActionsCellProps = {
  children: ReactNode;
  className?: string;
};

export function TableActionsCell({ children, className }: TableActionsCellProps) {
  return (
    <td
      className={cn(tableActionsCellClass, className)}
      data-row-click="ignore"
    >
      {children}
    </td>
  );
}
