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
      className="w-full rounded-xl border border-border bg-card px-2 py-4 shadow-sm sm:px-4"
      aria-label="Progreso del ritual"
    >
      <div className="flex w-full items-center">
        {steps.flatMap((step, index) => {
          const status = stepStatuses[step.id] ?? "pending";
          const isDone = status === "success";
          const isActive = index === displayStepIndex;
          const isCurrent = index === activeStepIndex;
          const canReview = isDone && index < activeStepIndex;
          const prevDone =
            index > 0 &&
            (stepStatuses[steps[index - 1]!.id] ?? "pending") === "success";

          const node = (
            <div
              key={step.id}
              className="flex shrink-0 flex-col items-center gap-1.5"
            >
              <button
                type="button"
                disabled={!canReview && !isActive && !isCurrent}
                onClick={() => onSelectStep(index)}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Paso ${step.step}: ${step.name}`}
                title={step.name}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border-2 text-[9px] font-bold transition-colors sm:size-7 sm:text-[10px]",
                  isDone &&
                    "border-emerald-500 bg-emerald-500 text-white",
                  isActive &&
                    !isDone &&
                    "border-accent bg-accent text-accent-foreground shadow-[0_0_0_4px] shadow-accent/25",
                  !isDone &&
                    !isActive &&
                    "border-border bg-card text-muted",
                  canReview && "cursor-pointer hover:border-emerald-600",
                  !canReview &&
                    !isActive &&
                    !isCurrent &&
                    "cursor-default",
                )}
              >
                {isDone ? (
                  <Check className="size-3 sm:size-3.5" strokeWidth={3} aria-hidden />
                ) : (
                  step.step
                )}
              </button>
              <span
                className={cn(
                  "text-[9px] font-medium leading-none sm:text-[10px]",
                  isActive
                    ? "text-accent"
                    : isDone
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-muted",
                )}
              >
                {step.step}
              </span>
            </div>
          );

          if (index === 0) {
            return [node];
          }

          return [
            <div
              key={`line-${step.id}`}
              className={cn(
                "h-0.5 min-w-1 flex-1 self-center transition-colors",
                prevDone ? "bg-emerald-500" : "bg-border",
              )}
              aria-hidden
            />,
            node,
          ];
        })}
      </div>
    </nav>
  );
}
