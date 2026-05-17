import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageToolbarProps = {
  description: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Intro + action buttons row used on list/manager pages. */
export function PageToolbar({
  description,
  actions,
  className,
}: PageToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <p className="min-w-0 text-sm text-muted">{description}</p>
      {actions ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:shrink-0">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
