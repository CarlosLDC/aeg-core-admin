"use client";

import { useMemo } from "react";
import {
  buildSerialRange,
  FISCAL_SERIAL_DIGIT_COUNT,
  FISCAL_SERIAL_LETTER_COUNT,
  type SerialRangeMode,
} from "@/lib/serial-range";
import { BATCH_FORM_INPUT_CLASS } from "@/components/ui/batch-form-dialog";
import { FieldLabel } from "@/components/ui/field-label";
import { cn } from "@/lib/utils";

export type SerialRangeFormValues = {
  prefix: string;
  from: string;
  to: string;
  digitLength: string;
};

export const emptySerialRangeForm = (): SerialRangeFormValues => ({
  prefix: "",
  from: "",
  to: "",
  digitLength: String(FISCAL_SERIAL_DIGIT_COUNT),
});

type SerialRangeFieldsProps = {
  mode: SerialRangeMode;
  values: SerialRangeFormValues;
  onChange: (values: SerialRangeFormValues) => void;
  disabled?: boolean;
};

export function SerialRangeFields({
  mode,
  values,
  onChange,
  disabled,
}: SerialRangeFieldsProps) {
  const preview = useMemo(() => {
    if (!values.from.trim() || !values.to.trim() || !values.prefix.trim()) {
      return null;
    }
    const digitLength =
      mode === "fiscal"
        ? FISCAL_SERIAL_DIGIT_COUNT
        : Number(values.digitLength) || FISCAL_SERIAL_DIGIT_COUNT;
    const built = buildSerialRange(
      {
        prefix: values.prefix,
        from: values.from,
        to: values.to,
        digitLength,
      },
      { mode },
    );
    if (typeof built === "string") {
      return { error: built, count: 0, first: "", last: "" };
    }
    return {
      error: null,
      count: built.length,
      first: built[0] ?? "",
      last: built[built.length - 1] ?? "",
    };
  }, [mode, values]);

  function patch(partial: Partial<SerialRangeFormValues>) {
    onChange({ ...values, ...partial });
  }

  const isFiscal = mode === "fiscal";

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="sr-only">
        {isFiscal ? "Rango de seriales fiscales" : "Rango de seriales"}
      </legend>

      <div
        className={cn(
          "grid gap-4",
          isFiscal ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        <label className={cn("block", isFiscal && "sm:col-span-1")}>
          <FieldLabel required>
            Prefijo {isFiscal ? "(3 letras)" : ""}
          </FieldLabel>
          <input
            type="text"
            required
            value={values.prefix}
            disabled={disabled}
            maxLength={isFiscal ? FISCAL_SERIAL_LETTER_COUNT : 20}
            onChange={(e) =>
              patch({
                prefix: isFiscal
                  ? e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase()
                  : e.target.value,
              })
            }
            className={cn(BATCH_FORM_INPUT_CLASS, isFiscal && "uppercase", "font-mono")}
            placeholder={isFiscal ? "ABC" : "SN-"}
          />
        </label>
        <label className="block">
          <FieldLabel required>Desde</FieldLabel>
          <input
            type="number"
            required
            min={0}
            value={values.from}
            disabled={disabled}
            onChange={(e) => patch({ from: e.target.value })}
            className={cn(BATCH_FORM_INPUT_CLASS, "font-mono")}
          />
        </label>
        <label className="block">
          <FieldLabel required>Hasta</FieldLabel>
          <input
            type="number"
            required
            min={0}
            value={values.to}
            disabled={disabled}
            onChange={(e) => patch({ to: e.target.value })}
            className={cn(BATCH_FORM_INPUT_CLASS, "font-mono")}
          />
        </label>
        {!isFiscal && (
          <label className="block">
            <FieldLabel required>Cifras</FieldLabel>
            <input
              type="number"
              required
              min={1}
              max={12}
              value={values.digitLength}
              disabled={disabled}
              onChange={(e) => patch({ digitLength: e.target.value })}
              className={cn(BATCH_FORM_INPUT_CLASS, "font-mono")}
            />
          </label>
        )}
      </div>

      {preview && (
        <p
          className={cn(
            "text-sm",
            preview.error
              ? "text-rose-700 dark:text-rose-300"
              : "text-muted",
          )}
          role={preview.error ? "alert" : "status"}
        >
          {preview.error ? (
            preview.error
          ) : (
            <>
              <span className="font-medium text-card-foreground">
                {preview.count}
              </span>{" "}
              {isFiscal ? "impresora" : "precinto"}
              {preview.count === 1 ? "" : "s"} ·{" "}
              <span className="font-mono text-xs text-card-foreground">
                {preview.first} … {preview.last}
              </span>
            </>
          )}
        </p>
      )}
    </fieldset>
  );
}
