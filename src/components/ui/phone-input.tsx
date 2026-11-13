"use client";

import { useId, type ChangeEvent, type ComponentPropsWithoutRef } from "react";
import {
  formatVenezuelanPhone,
  VENEZUELAN_PHONE_PLACEHOLDER,
} from "@/lib/venezuelan-phone";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
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
        formFieldInputClass,
        "text-card-foreground placeholder:text-muted",
        "disabled:bg-foreground/[0.03] disabled:text-muted disabled:opacity-100",
        className,
      )}
    />
  );
}
