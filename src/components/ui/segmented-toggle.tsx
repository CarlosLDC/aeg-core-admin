"use client";

import { cn } from "@/lib/utils";
import {
  segmentedToggleActiveClass,
  type ToggleTone,
} from "@/lib/toggle-button-styles";

export type SegmentedToggleOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  tone?: ToggleTone;
};

type SegmentedToggleProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedToggleOption<T>[];
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
};

export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  disabled,
  ariaLabel,
  className,
}: SegmentedToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-foreground/[0.03] p-1",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-full min-w-0 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium transition-all",
              selected
                ? segmentedToggleActiveClass(option.tone)
                : "text-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
