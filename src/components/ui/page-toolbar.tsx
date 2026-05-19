import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Toolbar action buttons: single-line label, full width on mobile only. */
export const pageToolbarButtonClass =
  "inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors md:w-auto";

type PageToolbarProps = {
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Action buttons row used on list/manager pages (optional intro text). */
export function PageToolbar({
  description,
  actions,
  className,
}: PageToolbarProps) {
  if (!description && !actions) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:flex-row md:flex-nowrap md:items-center md:gap-4",
        !description && actions && "md:justify-end",
        description && actions && "md:justify-between",
        className,
      )}
    >
      {description ? (
        <p className="min-w-0 flex-1 text-sm text-muted">{description}</p>
      ) : null}
      {actions ? (
        <div className="flex w-full shrink-0 flex-col gap-2 max-md:w-full md:w-auto md:flex-row md:flex-nowrap">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
