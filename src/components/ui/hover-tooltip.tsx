"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type HoverTooltipProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

export function HoverTooltip({
  label,
  children,
  className,
}: HoverTooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  function handleEnter() {
    if (!label.trim()) return;
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
            className="pointer-events-none fixed z-[200] max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-[calc(100%+6px)] rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium leading-snug text-card-foreground shadow-lg"
            style={{ left: position.x, top: position.y }}
          >
            {label}
            <span
              className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-card"
              aria-hidden
            />
          </div>,
          document.body,
        )}
    </>
  );
}
