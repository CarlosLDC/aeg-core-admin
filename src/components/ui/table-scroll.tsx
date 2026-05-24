import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TableScrollProps = {
  children: ReactNode;
  className?: string;
  /** Fade on the right edge to hint horizontal scroll (mobile). */
  showScrollHint?: boolean;
};

export function TableScroll({
  children,
  className,
  showScrollHint = true,
}: TableScrollProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]",
          "[&_th]:px-3 [&_th]:py-2.5 [&_th]:sm:px-5",
          "[&_tbody_tr]:h-14",
          "[&_tbody_td]:!py-0 [&_tbody_td]:align-middle [&_tbody_td]:px-3 [&_tbody_td]:sm:px-5",
          "[&_tbody_td:not([data-row-click=ignore])]:overflow-hidden [&_tbody_td:not([data-row-click=ignore])]:whitespace-nowrap",
        )}
      >
        {children}
      </div>
      {showScrollHint && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-card to-transparent sm:hidden"
          aria-hidden
        />
      )}
    </div>
  );
}
