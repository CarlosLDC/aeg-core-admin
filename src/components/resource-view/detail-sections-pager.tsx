"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type DetailPagerStep = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type DetailSectionsPagerProps = {
  steps: DetailPagerStep[];
  className?: string;
};

export function DetailSectionsPager({
  steps,
  className,
}: DetailSectionsPagerProps) {
  const [index, setIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hasMountedRef = useRef(false);

  const stepCount = steps.length;
  const safeIndex =
    stepCount === 0 ? 0 : Math.min(index, stepCount - 1);
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === stepCount - 1;
  const showNav = stepCount > 1;
  const current = steps[safeIndex];

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    tabRefs.current[safeIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [safeIndex]);

  useEffect(() => {
    if (!showNav) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && !isFirst) {
        e.preventDefault();
        setIndex((i) => i - 1);
      }
      if (e.key === "ArrowRight" && !isLast) {
        e.preventDefault();
        setIndex((i) => i + 1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFirst, isLast, showNav]);

  if (stepCount === 0 || !current) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {showNav && (
        <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
          <div
            className="flex flex-nowrap items-center gap-1 sm:flex-wrap sm:justify-center"
            role="tablist"
            aria-label="Secciones del detalle"
          >
            {steps.map((step, stepIndex) => {
              const isActive = stepIndex === safeIndex;
              return (
                <button
                  key={step.id}
                  ref={(el) => {
                    tabRefs.current[stepIndex] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  id={`detail-tab-${step.id}`}
                  aria-controls={`detail-panel-${step.id}`}
                  onClick={() => setIndex(stepIndex)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:bg-foreground/5 hover:text-foreground",
                  )}
                >
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        className="min-w-0 w-full"
        role="tabpanel"
        id={`detail-panel-${current.id}`}
        aria-labelledby={`detail-tab-${current.id}`}
      >
        {current.content}
      </div>
    </div>
  );
}
