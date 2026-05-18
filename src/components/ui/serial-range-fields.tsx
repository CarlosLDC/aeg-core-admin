"use client";

import { useMemo } from "react";
import {
  buildSerialRange,
  describeSerialRangePreview,
  FISCAL_SERIAL_DIGIT_COUNT,
  FISCAL_SERIAL_LETTER_COUNT,
  type SerialRangeMode,
} from "@/lib/serial-range";
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
  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

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
      return { error: built, count: 0, sample: "" };
    }
    return {
      error: null,
      count: built.length,
      sample: describeSerialRangePreview(built),
    };
  }, [mode, values]);

  function patch(partial: Partial<SerialRangeFormValues>) {
    onChange({ ...values, ...partial });
  }

  return (
    <div className="space-y-4 rounded-lg border border-accent/30 bg-accent/5 p-4">
      <div>
        <h3 className="text-sm font-semibold text-card-foreground">
          Rango de seriales
        </h3>
        <p className="mt-1 text-xs text-muted">
          {mode === "fiscal"
            ? `Prefijo de 3 letras y números consecutivos de ${FISCAL_SERIAL_DIGIT_COUNT} dígitos (ej. ABC0000001–ABC0000100).`
            : "Prefijo común y números consecutivos con la longitud indicada."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="mb-1.5 block text-sm font-medium">Prefijo</span>
          <input
            type="text"
            required
            value={values.prefix}
            disabled={disabled}
            maxLength={mode === "fiscal" ? FISCAL_SERIAL_LETTER_COUNT : 20}
            onChange={(e) =>
              patch({
                prefix:
                  mode === "fiscal"
                    ? e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase()
                    : e.target.value,
              })
            }
            className={cn(inputClass, "font-mono uppercase")}
            placeholder={mode === "fiscal" ? "ABC" : "SN-"}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Desde</span>
          <input
            type="number"
            required
            min={0}
            value={values.from}
            disabled={disabled}
            onChange={(e) => patch({ from: e.target.value })}
            className={cn(inputClass, "font-mono")}
            placeholder="1"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Hasta</span>
          <input
            type="number"
            required
            min={0}
            value={values.to}
            disabled={disabled}
            onChange={(e) => patch({ to: e.target.value })}
            className={cn(inputClass, "font-mono")}
            placeholder="100"
          />
        </label>
      </div>

      {mode === "flexible" && (
        <label className="block max-w-xs">
          <span className="mb-1.5 block text-sm font-medium">
            Dígitos del número
          </span>
          <input
            type="number"
            required
            min={1}
            max={12}
            value={values.digitLength}
            disabled={disabled}
            onChange={(e) => patch({ digitLength: e.target.value })}
            className={cn(inputClass, "font-mono")}
          />
        </label>
      )}

      {preview && (
        <p
          className={cn(
            "text-xs",
            preview.error
              ? "text-rose-700 dark:text-rose-300"
              : "text-muted",
          )}
          role={preview.error ? "alert" : undefined}
        >
          {preview.error
            ? preview.error
            : `${preview.count} registro${preview.count === 1 ? "" : "s"}: ${preview.sample}`}
        </p>
      )}
    </div>
  );
}
