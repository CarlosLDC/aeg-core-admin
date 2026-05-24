import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const tableActionsHeaderClass = cn(
  "sticky right-0 z-20 min-w-[5.5rem]",
  "bg-card px-4 py-3 font-medium text-center",
);

export const tableActionsCellClass = cn(
  "sticky right-0 z-10 min-w-[5.5rem] bg-card px-4 py-3.5",
);

export function TableActionsHeader() {
  return (
    <th className={tableActionsHeaderClass} data-actions-column="header">
      Acciones
    </th>
  );
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
      data-actions-column="cell"
    >
      {children}
    </td>
  );
}
