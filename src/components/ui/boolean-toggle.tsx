"use client";

import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import type { ToggleTone } from "@/lib/toggle-button-styles";

type BooleanToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  falseLabel?: string;
  trueLabel?: string;
  falseTone?: ToggleTone;
  trueTone?: ToggleTone;
  /** Etiqueta accesible del grupo */
  ariaLabel?: string;
  className?: string;
};

export function BooleanToggle({
  value,
  onChange,
  disabled,
  falseLabel = "No",
  trueLabel = "Sí",
  falseTone,
  trueTone = "teal",
  ariaLabel,
  className,
}: BooleanToggleProps) {
  return (
    <SegmentedToggle
      value={value ? "true" : "false"}
      onChange={(next) => onChange(next === "true")}
      disabled={disabled}
      ariaLabel={ariaLabel ?? `${falseLabel} o ${trueLabel}`}
      className={className}
      options={[
        { value: "false", label: falseLabel, tone: falseTone },
        { value: "true", label: trueLabel, tone: trueTone },
      ]}
    />
  );
}
