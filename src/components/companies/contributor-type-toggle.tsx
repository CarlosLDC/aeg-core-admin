"use client";

import { FieldLabel } from "@/components/ui/field-label";
import { CONTRIBUTOR_LABELS, CONTRIBUTOR_TOGGLE_TONE } from "@/lib/contributor-types";
import { toggleButtonClass } from "@/lib/toggle-button-styles";
import { CONTRIBUTOR_TYPES, type ContributorType } from "@/types/company";
import { cn } from "@/lib/utils";

type ContributorTypeToggleProps = {
  value: ContributorType;
  onChange: (value: ContributorType) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  showLabel?: boolean;
  className?: string;
};

export function ContributorTypeToggle({
  value,
  onChange,
  disabled = false,
  required = true,
  label = "Tipo de contribuyente",
  showLabel = true,
  className,
}: ContributorTypeToggleProps) {
  return (
    <div className={className}>
      {showLabel ? <FieldLabel required={required}>{label}</FieldLabel> : null}
      <div
        role="group"
        aria-label={label}
        className={cn("flex flex-wrap gap-2", showLabel && "mt-0")}
      >
        {CONTRIBUTOR_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            disabled={disabled}
            aria-pressed={value === type}
            onClick={() => onChange(type)}
            className={toggleButtonClass(
              value === type,
              CONTRIBUTOR_TOGGLE_TONE[type],
              { disabled },
            )}
          >
            {CONTRIBUTOR_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
