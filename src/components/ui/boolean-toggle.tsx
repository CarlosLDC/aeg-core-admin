"use client";

import { cn } from "@/lib/utils";

type BooleanToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  falseLabel?: string;
  trueLabel?: string;
  /** Etiqueta accesible del grupo */
  ariaLabel?: string;
};

export function BooleanToggle({
  value,
  onChange,
  disabled,
  falseLabel = "No",
  trueLabel = "Sí",
  ariaLabel,
}: BooleanToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel ?? `${falseLabel} o ${trueLabel}`}
      className={cn(
        "flex w-full rounded-lg border border-border bg-foreground/[0.03] p-1",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={!value}
        onClick={() => onChange(false)}
        className={cn(
          "flex-1 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
          !value
            ? "bg-card text-card-foreground shadow-sm ring-1 ring-border/60"
            : "text-muted hover:text-foreground",
        )}
      >
        {falseLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={value}
        onClick={() => onChange(true)}
        className={cn(
          "flex-1 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
          value
            ? "bg-teal-500/15 text-teal-800 shadow-sm ring-1 ring-teal-500/25 dark:text-teal-200"
            : "text-muted hover:text-foreground",
        )}
      >
        {trueLabel}
      </button>
    </div>
  );
}
