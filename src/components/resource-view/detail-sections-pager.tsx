"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

const SCROLL_BTN_CLASS =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted shadow-sm transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40";

export function DetailSectionsPager({
  steps,
  className,
}: DetailSectionsPagerProps) {
  const [index, setIndex] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabsOverflow, setTabsOverflow] = useState({ left: false, right: false });

  useEffect(() => {
    setIndex(0);
  }, [steps]);

  const safeIndex = Math.min(index, Math.max(0, steps.length - 1));
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === steps.length - 1;

  const updateTabsOverflow = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setTabsOverflow({
      left: scrollLeft > 4,
      right: scrollLeft + clientWidth < scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateTabsOverflow();
    const el = tabsRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateTabsOverflow, { passive: true });
    const ro = new ResizeObserver(updateTabsOverflow);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateTabsOverflow);
      ro.disconnect();
    };
  }, [steps, updateTabsOverflow]);

  useEffect(() => {
    const el = tabsRef.current;
    const active = el?.querySelector<HTMLElement>(`[data-step-index="${safeIndex}"]`);
    active?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
  }, [safeIndex]);

  useEffect(() => {
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
  }, [isFirst, isLast]);

  if (steps.length === 0) return null;

  function scrollTabs(direction: "left" | "right") {
    tabsRef.current?.scrollBy({
      left: direction === "left" ? -160 : 160,
      behavior: "smooth",
    });
  }

  const current = steps[safeIndex]!;

  return (
    <div className={cn("space-y-3", className)}>
      {steps.length > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollTabs("left")}
            disabled={!tabsOverflow.left}
            className={cn(SCROLL_BTN_CLASS, "hidden sm:inline-flex")}
            aria-label="Desplazar pestañas a la izquierda"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>

          <div
            ref={tabsRef}
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  data-step-index={stepIndex}
                  aria-selected={isActive}
                  id={`detail-tab-${step.id}`}
                  aria-controls={`detail-panel-${step.id}`}
                  onClick={() => setIndex(stepIndex)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                    "hover:bg-foreground/5",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-muted",
                  )}
                >
                  {step.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollTabs("right")}
            disabled={!tabsOverflow.right}
            className={cn(SCROLL_BTN_CLASS, "hidden sm:inline-flex")}
            aria-label="Desplazar pestañas a la derecha"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      )}

      <div className="flex items-stretch gap-2 sm:gap-3">
        {steps.length > 1 && (
          <button
            type="button"
            onClick={() => setIndex((i) => i - 1)}
            disabled={isFirst}
            className={cn(SCROLL_BTN_CLASS, "self-center")}
            aria-label="Sección anterior"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
        )}

        <div
          className="min-w-0 flex-1 overflow-hidden"
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

        {steps.length > 1 && (
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            disabled={isLast}
            className={cn(SCROLL_BTN_CLASS, "self-center")}
            aria-label="Sección siguiente"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        )}
      </div>

      {steps.length > 1 && (
        <p className="text-center text-xs text-muted" aria-live="polite">
          {safeIndex + 1} de {steps.length} · {current.label}
        </p>
      )}
    </div>
  );
}
