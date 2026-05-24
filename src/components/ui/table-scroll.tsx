import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [actionsOverlap, setActionsOverlap] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const updateOverlap = () => {
      setActionsOverlap(el.scrollLeft > 0);
    };
    updateOverlap();
    el.addEventListener("scroll", updateOverlap, { passive: true });
    window.addEventListener("resize", updateOverlap);
    return () => {
      el.removeEventListener("scroll", updateOverlap);
      window.removeEventListener("resize", updateOverlap);
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollRef}
        data-actions-overlap={actionsOverlap ? "true" : "false"}
        className={cn(
          "overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]",
          "[&_th]:px-3 [&_th]:py-2.5 [&_th]:sm:px-5",
          "[&_tbody_tr]:h-14",
          "[&_tbody_td]:!py-0 [&_tbody_td]:align-middle [&_tbody_td]:px-3 [&_tbody_td]:sm:px-5",
          "[&_tbody_td:not([data-row-click=ignore])]:overflow-hidden [&_tbody_td:not([data-row-click=ignore])]:whitespace-nowrap",
          "[&_[data-actions-column]]:shadow-none",
          "data-[actions-overlap=true]:[&_[data-actions-column]]:shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.15)]",
          "data-[actions-overlap=true]:dark:[&_[data-actions-column]]:shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.35)]",
        )}
      >
        {children}
      </div>
      {showScrollHint && (
        <div
          className="pointer-events-none absolute inset-y-0 right-[5.5rem] w-6 bg-gradient-to-l from-card to-transparent sm:hidden"
          aria-hidden
        />
      )}
    </div>
  );
}
