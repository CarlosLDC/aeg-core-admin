"use client";

import type { ClipboardEvent } from "react";
import {
  extractFiscalSerialParts,
  FISCAL_SERIAL_LETTER_COUNT,
  normalizeFiscalSerialDigits,
} from "@/lib/serial-range";
import { cn } from "@/lib/utils";

type FiscalSerialInputProps = {
  value: string;
  deducedPrefix?: string | null;
  hasSelectedModel?: boolean;
  onChange: (nextSerial: string) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
};

export function FiscalSerialInput({
  value,
  deducedPrefix,
  hasSelectedModel = false,
  onChange,
  disabled = false,
  required = false,
  id,
  className,
}: FiscalSerialInputProps) {
  const normalizedDeduced = (deducedPrefix ?? "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .slice(0, FISCAL_SERIAL_LETTER_COUNT);
  const hasDeducedPrefix = normalizedDeduced.length === FISCAL_SERIAL_LETTER_COUNT;
  const { prefix, digits } = extractFiscalSerialParts(value, normalizedDeduced);

  function emit(nextPrefix: string, nextDigits: string) {
    onChange(`${nextPrefix}${nextDigits}`);
  }

  function handleDigitsChange(raw: string) {
    const nextDigits = normalizeFiscalSerialDigits(raw);
    emit(prefix, nextDigits);
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!pasted) return;
    event.preventDefault();
    const cleaned = pasted.trim().toUpperCase();
    const withoutPrefix = cleaned.replace(/^[A-Z]{1,3}/, "");
    const nextDigits = normalizeFiscalSerialDigits(withoutPrefix);
    emit(prefix, nextDigits);
  }

  return (
    <div
      className={cn(
        "flex h-10 w-full overflow-hidden rounded-lg border border-border bg-background transition-shadow focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/20",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      {hasDeducedPrefix ? (
        <span
          aria-label="Prefijo del serial"
          className="flex shrink-0 select-none items-center border-r border-border bg-foreground/[0.04] px-3 font-mono text-sm font-semibold tracking-wider text-card-foreground"
        >
          {normalizedDeduced}
        </span>
      ) : (
        <input
          type="text"
          aria-label="Prefijo del serial"
          maxLength={FISCAL_SERIAL_LETTER_COUNT}
          value={prefix}
          disabled={disabled}
          required={required}
          placeholder={hasSelectedModel ? "ABC" : "---"}
          onChange={(e) => {
            const nextPrefix = e.target.value
              .replace(/[^a-zA-Z]/g, "")
              .toUpperCase()
              .slice(0, FISCAL_SERIAL_LETTER_COUNT);
            emit(nextPrefix, digits);
          }}
          className="w-16 shrink-0 border-r border-border bg-foreground/[0.03] px-2 text-center font-mono text-sm font-semibold uppercase tracking-wider text-card-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed"
        />
      )}

      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label="Dígitos del serial fiscal"
        required={required}
        disabled={disabled}
        value={digits}
        onFocus={(e) => {
          const input = e.currentTarget;
          requestAnimationFrame(() => {
            if (input.value === "0000000") {
              input.setSelectionRange(input.value.length, input.value.length);
            }
          });
        }}
        onPaste={handlePaste}
        onChange={(e) => handleDigitsChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm tracking-[0.16em] text-card-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed sm:tracking-[0.2em]"
      />
    </div>
  );
}
