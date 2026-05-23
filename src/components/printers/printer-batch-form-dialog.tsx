"use client";

import { FormEvent, useEffect, useState } from "react";
import type { SelectOption } from "@/components/printers/printer-form-dialog";
import {
  BatchFormDialog,
  BATCH_FORM_INPUT_CLASS,
} from "@/components/ui/batch-form-dialog";
import { FieldLabel } from "@/components/ui/field-label";
import {
  emptySerialRangeForm,
  SerialRangeFields,
  type SerialRangeFormValues,
} from "@/components/ui/serial-range-fields";
import { emptyPrinterForm, type PrinterFormValues } from "@/lib/printer-form";
import { buildSerialRange } from "@/lib/serial-range";

export type PrinterBatchSubmitPayload = {
  serials: string[];
  base: Omit<PrinterFormValues, "fiscalSerial">;
};

type PrinterBatchFormDialogProps = {
  open: boolean;
  saving: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  modelOptions: SelectOption[];
  modelsLoading: boolean;
  lockDistributor: boolean;
  defaultDistributorId?: number | null;
  onClose: () => void;
  onSubmit: (payload: PrinterBatchSubmitPayload) => void;
};

export function PrinterBatchFormDialog({
  open,
  saving,
  progress,
  error,
  modelOptions,
  modelsLoading,
  lockDistributor,
  defaultDistributorId,
  onClose,
  onSubmit,
}: PrinterBatchFormDialogProps) {
  const [range, setRange] = useState<SerialRangeFormValues>(emptySerialRangeForm());
  const [form, setForm] = useState<Omit<PrinterFormValues, "fiscalSerial">>(
    emptyPrinterForm(),
  );

  useEffect(() => {
    if (!open) return;
    const distributorDefault =
      defaultDistributorId != null ? String(defaultDistributorId) : "";
    setRange(emptySerialRangeForm());
    setForm(
      emptyPrinterForm({
        distributorId: lockDistributor ? distributorDefault : "",
      }),
    );
  }, [open, lockDistributor, defaultDistributorId]);

  const disabled = saving || modelsLoading;
  const busy = saving;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const serials = buildSerialRange(range, { mode: "fiscal" });
    if (typeof serials === "string") return;
    onSubmit({ serials, base: form });
  }

  return (
    <BatchFormDialog
      open={open}
      title="Crear impresoras por lote"
      error={error}
      progress={progress}
      busy={busy}
      submitDisabled={disabled}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <SerialRangeFields
        mode="fiscal"
        values={range}
        onChange={setRange}
        disabled={disabled}
      />

      <label className="block">
        <FieldLabel required>Modelo fiscal</FieldLabel>
        {modelOptions.length > 0 ? (
          <select
            required
            value={form.modelId}
            disabled={disabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, modelId: e.target.value }))
            }
            className={BATCH_FORM_INPUT_CLASS}
          >
            <option value="">Seleccionar…</option>
            {modelOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            required
            min={1}
            value={form.modelId}
            disabled={disabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, modelId: e.target.value }))
            }
            className={BATCH_FORM_INPUT_CLASS}
            placeholder="ID del modelo"
          />
        )}
      </label>
    </BatchFormDialog>
  );
}
