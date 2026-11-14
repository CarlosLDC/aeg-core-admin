"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import { FiscalSerialInput } from "@/components/printers/fiscal-serial-input";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import { BatchFormDialog } from "@/components/ui/batch-form-dialog";
import { FieldLabel } from "@/components/ui/field-label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  applyModelPrefixToFiscalSerial,
  buildSerialRange,
  extractFiscalSerialParts,
  FISCAL_SERIAL_DIGIT_COUNT,
  FISCAL_SERIAL_LETTER_COUNT,
} from "@/lib/serial-range";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";

export const PRINTER_BATCH_SIZE = 8;

const MAX_FISCAL_SERIAL_NUMBER = 10 ** FISCAL_SERIAL_DIGIT_COUNT - 1;
const MAX_BATCH_START_NUMBER =
  MAX_FISCAL_SERIAL_NUMBER - (PRINTER_BATCH_SIZE - 1);

export type PrinterBatchSubmitPayload = {
  boxNumber: number;
  modelId: string;
  serials: string[];
};

type PrinterBatchFormDialogProps = {
  open: boolean;
  saving: boolean;
  progress?: { done: number; total: number } | null;
  error?: string | null;
  modelOptions: SelectOption[];
  modelsLoading?: boolean;
  suggestedBoxNumber: number;
  existingBoxNumbers: number[];
  onClose: () => void;
  onSubmit: (payload: PrinterBatchSubmitPayload) => Promise<void> | void;
};

export function PrinterBatchFormDialog(props: PrinterBatchFormDialogProps) {
  if (!props.open) return null;
  return <PrinterBatchFormDialogContent {...props} />;
}

function PrinterBatchFormDialogContent({
  open,
  saving,
  progress = null,
  error = null,
  modelOptions,
  modelsLoading = false,
  suggestedBoxNumber,
  existingBoxNumbers,
  onClose,
  onSubmit,
}: PrinterBatchFormDialogProps) {
  const formId = useId();
  const boxNumberInputId = useId();
  const startSerialInputId = useId();
  const endSerialLabelId = useId();

  const [modelId, setModelId] = useState("");
  const [boxNumber, setBoxNumber] = useState(() => String(suggestedBoxNumber));
  const [startSerial, setStartSerial] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const disabled = saving || modelsLoading;
  const modelSelectDisabled = disabled || modelOptions.length === 0;

  const selectedModelPrefix = useMemo(
    () =>
      modelOptions.find((opt) => String(opt.id) === modelId)?.serialPrefix ??
      null,
    [modelOptions, modelId],
  );

  const existingBoxSet = useMemo(
    () => new Set(existingBoxNumbers),
    [existingBoxNumbers],
  );

  const parsedBoxNumber = useMemo(() => {
    const raw = boxNumber.trim();
    if (!raw || !/^\d+$/.test(raw)) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [boxNumber]);

  const isExistingBox =
    parsedBoxNumber != null && existingBoxSet.has(parsedBoxNumber);

  const {
    prefix,
    fromNumber,
    hasValidPrefix,
    hasStartNumber,
    overflowsDigits,
    endDigits,
    rangeSummary,
  } = useMemo(() => {
    const parts = extractFiscalSerialParts(startSerial, selectedModelPrefix);
    const parsedFrom = Number(parts.digits);
    const validPrefix = new RegExp(`^[A-Z]{${FISCAL_SERIAL_LETTER_COUNT}}$`).test(
      parts.prefix,
    );
    const validStart = Number.isInteger(parsedFrom) && parsedFrom >= 1;
    const toNumber = parsedFrom + PRINTER_BATCH_SIZE - 1;
    const overflows = validStart && toNumber > MAX_FISCAL_SERIAL_NUMBER;
    const computedEndDigits =
      validStart && !overflows
        ? String(toNumber).padStart(FISCAL_SERIAL_DIGIT_COUNT, "0")
        : null;

    if (!validPrefix || !validStart || overflows) {
      return {
        prefix: parts.prefix,
        fromNumber: parsedFrom,
        hasValidPrefix: validPrefix,
        hasStartNumber: validStart,
        overflowsDigits: overflows,
        endDigits: computedEndDigits,
        rangeSummary: null as { ok: true; serials: string[] } | { ok: false; message: string } | null,
      };
    }

    const built = buildSerialRange(
      {
        prefix: parts.prefix,
        from: String(parsedFrom),
        to: String(toNumber),
      },
      { mode: "fiscal" },
    );

    return {
      prefix: parts.prefix,
      fromNumber: parsedFrom,
      hasValidPrefix: validPrefix,
      hasStartNumber: validStart,
      overflowsDigits: overflows,
      endDigits: computedEndDigits,
      rangeSummary:
        typeof built === "string"
          ? { ok: false as const, message: built }
          : { ok: true as const, serials: built },
    };
  }, [startSerial, selectedModelPrefix]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    const trimmedModelId = modelId.trim();
    const parsedModelId = Number(trimmedModelId);
    if (
      !trimmedModelId ||
      !Number.isInteger(parsedModelId) ||
      parsedModelId <= 0
    ) {
      setLocalError("Selecciona un modelo fiscal válido.");
      return;
    }

    if (parsedBoxNumber == null) {
      setLocalError("El número de lote debe ser un entero positivo.");
      return;
    }

    if (!hasValidPrefix) {
      setLocalError(
        selectedModelPrefix
          ? "Selecciona un modelo fiscal para deducir el prefijo del serial."
          : "El prefijo del serial fiscal debe tener 3 letras.",
      );
      return;
    }

    if (!hasStartNumber || fromNumber < 1) {
      setLocalError("Ingresa un serial fiscal inicial mayor a 0000000.");
      return;
    }

    if (overflowsDigits) {
      setLocalError(
        `El serial inicial supera el máximo permitido (${MAX_BATCH_START_NUMBER}) para completar ${PRINTER_BATCH_SIZE} impresoras.`,
      );
      return;
    }

    if (!rangeSummary?.ok || rangeSummary.serials.length !== PRINTER_BATCH_SIZE) {
      setLocalError(
        rangeSummary && !rangeSummary.ok
          ? rangeSummary.message
          : `El lote debe generar exactamente ${PRINTER_BATCH_SIZE} seriales fiscales válidos.`,
      );
      return;
    }

    setLocalError(null);
    await onSubmit({
      boxNumber: parsedBoxNumber,
      modelId: trimmedModelId,
      serials: rangeSummary.serials,
    });
  }

  const displayError = localError ?? error;
  const displayPrefix = hasValidPrefix ? prefix : "---";
  const bannerError = overflowsDigits
    ? `El serial inicial supera el máximo (${String(MAX_BATCH_START_NUMBER).padStart(FISCAL_SERIAL_DIGIT_COUNT, "0")}) para generar ${PRINTER_BATCH_SIZE} impresoras.`
    : rangeSummary && !rangeSummary.ok
      ? rangeSummary.message
      : null;

  return (
    <BatchFormDialog
      open={open}
      title="Crear impresoras por lote"
      description={`Registra un lote fijo de ${PRINTER_BATCH_SIZE} impresoras sin asignar del mismo modelo fiscal.`}
      error={displayError}
      progress={progress}
      busy={saving}
      submitDisabled={disabled}
      formId={formId}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <fieldset className="space-y-4" disabled={saving}>
        <legend className="sr-only">Datos del lote de impresoras</legend>

        {modelOptions.length === 0 && !modelsLoading ? (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            No se pudo cargar el catálogo de modelos. Indica el ID del modelo
            manualmente o solicita acceso al catálogo de modelos fiscales.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel required>Modelo fiscal</FieldLabel>
            {modelOptions.length > 0 ? (
              <NativeSelect
                required
                value={modelId}
                disabled={modelSelectDisabled}
                onChange={(e) => {
                  const nextModelId = e.target.value;
                  const nextPrefix =
                    modelOptions.find((opt) => String(opt.id) === nextModelId)
                      ?.serialPrefix ?? null;
                  setModelId(nextModelId);
                  setStartSerial((prev) =>
                    applyModelPrefixToFiscalSerial(prev, nextPrefix),
                  );
                  setLocalError(null);
                }}
              >
                <option value="">Seleccionar modelo…</option>
                {modelOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <input
                type="number"
                required
                min={1}
                value={modelId}
                disabled={disabled}
                onChange={(e) => {
                  setModelId(e.target.value);
                  setLocalError(null);
                }}
                className={formFieldInputClass}
                placeholder="ID del modelo"
              />
            )}
          </label>

          <label htmlFor={boxNumberInputId} className="block">
            <FieldLabel required>Número de caja / lote</FieldLabel>
            <input
              id={boxNumberInputId}
              type="number"
              min={1}
              step={1}
              required
              value={boxNumber}
              disabled={saving}
              onChange={(e) => {
                setBoxNumber(e.target.value);
                setLocalError(null);
              }}
              className={cn(
                formFieldInputClass,
                "font-mono text-card-foreground",
              )}
              placeholder={String(suggestedBoxNumber)}
            />
          </label>

          <div className="block">
            <label htmlFor={startSerialInputId} className="block">
              <FieldLabel required>Serial fiscal inicial (Desde)</FieldLabel>
            </label>
            <FiscalSerialInput
              id={startSerialInputId}
              required
              value={startSerial}
              deducedPrefix={selectedModelPrefix}
              hasSelectedModel={Boolean(modelId.trim())}
              disabled={saving}
              onChange={(nextSerial) => {
                setStartSerial(nextSerial);
                setLocalError(null);
              }}
            />
          </div>

          <div className="block">
            <span id={endSerialLabelId} className="block">
              <FieldLabel>Serial fiscal final (Hasta)</FieldLabel>
            </span>
            <div
              aria-labelledby={endSerialLabelId}
              className="flex h-10 w-full overflow-hidden rounded-lg border border-border bg-foreground/[0.03]"
            >
              <span
                aria-label="Prefijo del serial final"
                className={cn(
                  "flex shrink-0 select-none items-center border-r border-border bg-foreground/[0.04] px-3 font-mono text-sm font-semibold tracking-wider",
                  hasValidPrefix ? "text-card-foreground" : "text-muted",
                )}
              >
                {displayPrefix}
              </span>
              <span
                aria-label="Dígitos del serial final"
                className={cn(
                  "flex min-w-0 flex-1 items-center px-3 font-mono text-sm tracking-[0.16em] sm:tracking-[0.2em]",
                  endDigits != null ? "text-card-foreground" : "text-muted/60",
                )}
              >
                {endDigits ?? "-------"}
              </span>
            </div>
          </div>
        </div>

        {bannerError ? (
          <div
            className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-700 dark:text-rose-300"
            role="alert"
          >
            {bannerError}
          </div>
        ) : rangeSummary?.ok && parsedBoxNumber != null ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/25 bg-accent/5 px-3.5 py-2.5 text-sm text-muted"
            role="status"
          >
            <span>
              <span className="font-medium text-card-foreground">
                Lote #{parsedBoxNumber}
              </span>{" "}
              ({isExistingBox ? "caja existente" : "nueva caja"}) · {PRINTER_BATCH_SIZE} impresoras sin asignar
            </span>
            <span className="font-mono text-xs font-medium text-card-foreground">
              {rangeSummary.serials[0]} →{" "}
              {rangeSummary.serials[rangeSummary.serials.length - 1]}
            </span>
          </div>
        ) : null}
      </fieldset>
    </BatchFormDialog>
  );
}
