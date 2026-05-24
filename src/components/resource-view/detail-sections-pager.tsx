"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    setIndex(0);
  }, [steps]);

  const stepCount = steps.length;
  const safeIndex =
    stepCount === 0 ? 0 : Math.min(index, stepCount - 1);
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === stepCount - 1;
  const showNav = stepCount > 1;
  const current = steps[safeIndex];

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
        <div
          className="flex flex-wrap justify-center gap-1"
          role="tablist"
          aria-label="Secciones del detalle"
        >
          {steps.map((step, stepIndex) => {
            const isActive = stepIndex === safeIndex;
            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                id={`detail-tab-${step.id}`}
                aria-controls={`detail-panel-${step.id}`}
                onClick={() => setIndex(stepIndex)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                  "hover:bg-foreground/5",
                  isActive ? "bg-accent/10 text-accent" : "text-muted",
                )}
              >
                {step.label}
              </button>
            );
          })}
        </div>
      )}

      <div
        className="min-w-0 w-full overflow-hidden"
        role="tabpanel"
        id={`detail-panel-${current.id}`}
        aria-labelledby={`detail-tab-${current.id}`}
      >
        <div
          className="flex transition-transform duration-200 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {steps.map((step) => (
            <div key={step.id} className="w-full shrink-0">
              {step.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
