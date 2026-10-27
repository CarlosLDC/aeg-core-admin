"use client";

import { cn } from "@/lib/utils";
import {
  toggleButtonClass,
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
}: SegmentedToggleProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-2", className)}
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
            className={toggleButtonClass(selected, option.tone, { disabled })}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
