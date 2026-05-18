"use client";

import { useMemo } from "react";
import {
  buildSerialRange,
  describeSerialRangePreview,
  FISCAL_SERIAL_DIGIT_COUNT,
  FISCAL_SERIAL_LETTER_COUNT,
  type SerialRangeMode,
} from "@/lib/serial-range";
import { BATCH_FORM_INPUT_CLASS } from "@/components/ui/batch-form-dialog";
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
      return { error: built, count: 0, first: "", last: "", sample: "" };
    }
    return {
      error: null,
      count: built.length,
      first: built[0] ?? "",
      last: built[built.length - 1] ?? "",
      sample: describeSerialRangePreview(built),
    };
  }, [mode, values]);

  function patch(partial: Partial<SerialRangeFormValues>) {
    onChange({ ...values, ...partial });
  }

  const isFiscal = mode === "fiscal";

  return (
    <div className="space-y-4 rounded-lg border border-accent/30 bg-accent/5 p-4 sm:p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Paso 1 · Seriales
        </p>
        <h3 className="mt-1 text-sm font-semibold text-card-foreground">
          {isFiscal ? "Rango de seriales fiscales" : "Rango de seriales del precinto"}
        </h3>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          {isFiscal ? (
            <>
              Todas las impresoras del lote comparten modelo, distribuidor y demás
              datos; solo cambia el <strong className="font-medium text-foreground">serial fiscal</strong>.
              Usa un prefijo de 3 letras y un tramo numérico de 7 dígitos.
            </>
          ) : (
            <>
              Todos los precintos del lote tendrán el mismo color, estatus e
              impresora; solo cambia el <strong className="font-medium text-foreground">serial</strong>.
              Indica un prefijo (texto fijo) y los números consecutivos que quieres
              generar.
            </>
          )}
        </p>
        <p className="mt-2 rounded-md bg-background/80 px-3 py-2 font-mono text-xs text-muted">
          {isFiscal ? (
            <>
              Ejemplo: prefijo <span className="text-foreground">ABC</span>, desde{" "}
              <span className="text-foreground">1</span> hasta{" "}
              <span className="text-foreground">100</span> →{" "}
              <span className="text-foreground">ABC0000001</span> …{" "}
              <span className="text-foreground">ABC0000100</span>
            </>
          ) : (
            <>
              Ejemplo: prefijo <span className="text-foreground">SN-</span>, desde{" "}
              <span className="text-foreground">1</span> hasta{" "}
              <span className="text-foreground">100</span>, 7 cifras →{" "}
              <span className="text-foreground">SN-0000001</span> …{" "}
              <span className="text-foreground">SN-0000100</span>
            </>
          )}
        </p>
      </div>

      <div
        className={cn(
          "grid gap-4",
          isFiscal ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        <label className={cn("block", isFiscal && "sm:col-span-1")}>
          <span className="mb-1.5 block text-sm font-medium">
            Prefijo {isFiscal ? "(3 letras)" : "(texto fijo)"}
          </span>
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
          {!isFiscal && (
            <span className="mt-1 block text-xs text-muted">
              Puede incluir guiones u otros caracteres.
            </span>
          )}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Número desde</span>
          <input
            type="number"
            required
            min={0}
            value={values.from}
            disabled={disabled}
            onChange={(e) => patch({ from: e.target.value })}
            className={cn(BATCH_FORM_INPUT_CLASS, "font-mono")}
            placeholder="1"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Número hasta</span>
          <input
            type="number"
            required
            min={0}
            value={values.to}
            disabled={disabled}
            onChange={(e) => patch({ to: e.target.value })}
            className={cn(BATCH_FORM_INPUT_CLASS, "font-mono")}
            placeholder="100"
          />
        </label>
        {!isFiscal && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Cifras del número
            </span>
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
            <span className="mt-1 block text-xs text-muted">
              Ceros a la izquierda (habitual: 7).
            </span>
          </label>
        )}
      </div>

      {preview && (
        <div
          className={cn(
            "rounded-lg border px-3 py-3 text-sm",
            preview.error
              ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              : "border-border bg-card text-card-foreground",
          )}
          role={preview.error ? "alert" : "status"}
        >
          {preview.error ? (
            preview.error
          ) : (
            <>
              <p className="font-medium">
                Se crearán{" "}
                <span className="font-semibold text-accent">{preview.count}</span>{" "}
                {isFiscal ? "impresora" : "precinto"}
                {preview.count === 1 ? "" : "s"}
              </p>
              <p className="mt-1.5 font-mono text-xs text-muted">
                Primero: <span className="text-foreground">{preview.first}</span>
                {" · "}
                Último: <span className="text-foreground">{preview.last}</span>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
