"use client";

import { SegmentedToggle } from "@/components/ui/segmented-toggle";

type BooleanToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  falseLabel?: string;
  trueLabel?: string;
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
        { value: "false", label: falseLabel },
        { value: "true", label: trueLabel, tone: "teal" },
      ]}
    />
  );
}
