"use client";

import { cn } from "@/lib/utils";
import {
  formFieldSegmentedToggleShellClass,
  segmentedToggleActiveClass,
  type ToggleTone,
} from "@/lib/toggle-button-styles";

export type SegmentedToggleOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  tone?: ToggleTone;
};

type SegmentedToggleLayout = "inline" | "wrap";

type SegmentedToggleProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedToggleOption<T>[];
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  layout?: SegmentedToggleLayout;
};

export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  disabled,
  ariaLabel,
  className,
  layout = "inline",
}: SegmentedToggleProps<T>) {
  const wrapLayout = layout === "wrap";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        wrapLayout
          ? "flex w-full flex-wrap gap-1 rounded-lg border border-border bg-foreground/[0.03] p-1"
          : formFieldSegmentedToggleShellClass,
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
              "flex items-center justify-center rounded-md text-sm font-medium transition-all",
              wrapLayout
                ? "h-10 min-w-[calc(50%-0.25rem)] flex-1 px-2 leading-tight sm:min-w-0 sm:px-3"
                : "h-full min-w-0 flex-1 px-3",
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
