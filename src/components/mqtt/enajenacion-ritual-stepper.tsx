"use client";

import { Check } from "lucide-react";
import type { RitualStep, RitualStepStatus } from "@/hooks/use-enajenacion-ritual";
import { cn } from "@/lib/utils";

export function EnajenacionRitualStepper({
  steps,
  stepStatuses,
  activeStepIndex,
  displayStepIndex,
  onSelectStep,
}: {
  steps: RitualStep[];
  stepStatuses: Record<string, RitualStepStatus>;
  activeStepIndex: number;
  displayStepIndex: number;
  onSelectStep: (index: number) => void;
}) {
  return (
    <nav
      className="flex gap-0.5 overflow-x-auto pb-1"
      aria-label="Progreso del ritual"
    >
      {steps.map((step, index) => {
        const status = stepStatuses[step.id] ?? "pending";
        const isDone = status === "success";
        const isActive = index === displayStepIndex;
        const isCurrent = index === activeStepIndex;
        const canReview = isDone && index < activeStepIndex;

        return (
          <button
            key={step.id}
            type="button"
            disabled={!canReview && !isActive && !isCurrent}
            onClick={() => onSelectStep(index)}
            aria-current={isActive ? "step" : undefined}
            title={step.name}
            className={cn(
              "flex min-w-[2.25rem] shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center transition-colors",
              canReview && "cursor-pointer hover:bg-foreground/5",
              isActive && "bg-accent/10",
              !canReview && !isActive && !isCurrent && "cursor-default opacity-50",
            )}
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-[11px] font-semibold",
                isDone && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                isActive && !isDone && "bg-accent text-accent-foreground",
                !isDone && !isActive && "bg-foreground/5 text-muted",
              )}
            >
              {isDone ? (
                <Check className="size-3.5" aria-hidden />
              ) : (
                step.step
              )}
            </span>
            <span
              className={cn(
                "max-w-[3rem] truncate text-[10px] font-medium leading-tight",
                isActive ? "text-accent" : "text-muted",
              )}
            >
              {step.step}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
