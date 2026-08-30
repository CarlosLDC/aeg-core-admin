"use client";

import { useId, type ChangeEvent, type ComponentPropsWithoutRef } from "react";
import {
  formatVenezuelanPhone,
  VENEZUELAN_PHONE_PLACEHOLDER,
} from "@/lib/venezuelan-phone";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<ComponentPropsWithoutRef<"input">, "onChange" | "value"> {
  value?: string;
  onChange?: (value: string) => void;
}

export function PhoneInput({
  value = "",
  onChange,
  placeholder = VENEZUELAN_PHONE_PLACEHOLDER,
  disabled = false,
  required = false,
  className,
  id,
  ...props
}: PhoneInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const formattedValue = formatVenezuelanPhone(value);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const formatted = formatVenezuelanPhone(raw);
    onChange?.(formatted);
  }

  return (
    <input
      {...props}
      id={inputId}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      disabled={disabled}
      required={required}
      maxLength={12}
      value={formattedValue}
      placeholder={placeholder}
      onChange={handleChange}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground shadow-xs transition-colors",
        "placeholder:text-muted focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/20",
        "disabled:cursor-not-allowed disabled:bg-foreground/[0.03] disabled:text-muted disabled:opacity-100",
        className,
      )}
    />
  );
}
