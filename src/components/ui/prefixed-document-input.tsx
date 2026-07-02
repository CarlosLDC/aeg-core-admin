"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  CEDULA_LETTERS,
  formatCedula,
  formatRif,
  parseCedula,
  parseRif,
  RIF_LETTERS,
} from "@/lib/venezuelan-id";
import { cn } from "@/lib/utils";

export type PrefixedDocumentKind = "rif" | "cedula";

const KIND_CONFIG = {
  rif: {
    letters: RIF_LETTERS,
    defaultLetter: "J",
    maxDigits: 9,
    placeholder: "123456789",
    ariaLabel: "Prefijo del RIF",
    digitsLabel: "Número del RIF",
  },
  cedula: {
    letters: CEDULA_LETTERS,
    defaultLetter: "V",
    maxDigits: 9,
    placeholder: "12345678",
    ariaLabel: "Prefijo de la cédula",
    digitsLabel: "Número de cédula",
  },
} as const;

type PrefixedDocumentInputProps = {
  kind: PrefixedDocumentKind;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
};

export function PrefixedDocumentInput({
  kind,
  value,
  onChange,
  disabled = false,
  required = false,
  className,
  id,
}: PrefixedDocumentInputProps) {
  const config = KIND_CONFIG[kind];
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const prefixId = `${inputId}-prefix`;

  const format =
    kind === "rif"
      ? (letter: string, digits: string) => formatRif(letter, digits)
      : (letter: string, digits: string) => formatCedula(letter, digits);

  const initial =
    kind === "rif" ? parseRif(value) : parseCedula(value);
  const [letter, setLetter] = useState<string>(initial.letter);
  const [digits, setDigits] = useState(initial.digits);

  useEffect(() => {
    const parsed =
      kind === "rif" ? parseRif(value) : parseCedula(value);
    setLetter(parsed.letter);
    setDigits(parsed.digits);
  }, [value, kind]);

  function emit(nextLetter: string, nextDigits: string) {
    onChange(format(nextLetter, nextDigits));
  }

  return (
    <div
      className={cn(
        "flex w-full overflow-hidden rounded-lg border border-border bg-background transition-shadow focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/20",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <div className="relative shrink-0 border-r border-border bg-foreground/[0.03]">
        <label htmlFor={prefixId} className="sr-only">
          {config.ariaLabel}
        </label>
        <select
          id={prefixId}
          value={letter}
          disabled={disabled}
          onChange={(event) => {
            const nextLetter = event.target.value;
            setLetter(nextLetter);
            emit(nextLetter, digits);
          }}
          className="h-10 appearance-none bg-transparent py-2 pl-3 pr-8 text-sm font-semibold uppercase text-card-foreground outline-none disabled:cursor-not-allowed"
        >
          {config.letters.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        required={required}
        value={digits}
        maxLength={config.maxDigits}
        placeholder={config.placeholder}
        aria-label={config.digitsLabel}
        onChange={(event) => {
          const nextDigits = event.target.value.replace(/\D/g, "");
          setDigits(nextDigits);
          emit(letter, nextDigits);
        }}
        className="h-10 min-w-0 flex-1 border-0 bg-transparent px-3 font-mono text-sm outline-none disabled:cursor-not-allowed"
      />
    </div>
  );
}
