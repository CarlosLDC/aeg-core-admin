"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type HoverTooltipProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
  /** Solo muestra la burbuja si el contenido está truncado por overflow. */
  onlyWhenOverflow?: boolean;
};

function isContentOverflowing(anchor: HTMLElement): boolean {
  const target =
    anchor.querySelector<HTMLElement>("[data-truncate-measure]") ?? anchor;
  if (target.scrollWidth > target.clientWidth) return true;
  if (target.scrollWidth > Math.ceil(target.getBoundingClientRect().width)) {
    return true;
  }
  try {
    const range = document.createRange();
    range.selectNodeContents(target);
    const rangeWidth = range.getBoundingClientRect().width;
    const targetWidth = target.getBoundingClientRect().width;
    return rangeWidth > targetWidth + 0.5;
  } catch {
    return false;
  }
}

export function HoverTooltip({
  label,
  children,
  className,
  onlyWhenOverflow = false,
}: HoverTooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [placement, setPlacement] = useState<"top" | "bottom">("top");

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const showBelow = rect.top < 65;
    setPlacement(showBelow ? "bottom" : "top");

    // Clamp horizontal center so tooltip never overflows left or right of viewport
    const halfTooltip = 160;
    const padding = 16;
    const centerX = rect.left + rect.width / 2;
    const minX = halfTooltip + padding;
    const maxX =
      typeof window !== "undefined"
        ? Math.max(minX, window.innerWidth - halfTooltip - padding)
        : centerX;
    const clampedX = Math.min(Math.max(centerX, minX), maxX);

    setPosition({
      x: clampedX,
      y: showBelow ? rect.bottom : rect.top,
    });
  }, []);

  function handleEnter() {
    if (!label.trim() || label === "—") return;
    const anchor = anchorRef.current;
    if (!anchor) return;
    if (onlyWhenOverflow && !isContentOverflowing(anchor)) return;
    updatePosition();
    setOpen(true);
  }

  function handleLeave() {
    setOpen(false);
  }

  return (
    <>
      <span
        ref={anchorRef}
        className={cn("relative inline-block max-w-full min-w-0", className)}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
      >
        {children}
      </span>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            className={cn(
              "pointer-events-none fixed z-[200] max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium leading-snug text-card-foreground shadow-lg",
              placement === "top"
                ? "-translate-y-[calc(100%+6px)]"
                : "translate-y-[6px]",
            )}
            style={{ left: position.x, top: position.y }}
          >
            {label}
            <span
              className={cn(
                "absolute left-1/2 size-2 -translate-x-1/2 rotate-45 border-border bg-card",
                placement === "top"
                  ? "top-full -translate-y-1/2 border-b border-r"
                  : "bottom-full translate-y-1/2 border-t border-l",
              )}
              aria-hidden
            />
          </div>,
          document.body,
        )}
    </>
  );
}
