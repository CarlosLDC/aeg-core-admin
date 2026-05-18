"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  PrinterSelect,
  type PrinterSelectOption,
} from "@/components/printers/printer-select";
import {
  BatchFormDialog,
  BatchFormStepSection,
  BATCH_FORM_INPUT_CLASS,
} from "@/components/ui/batch-form-dialog";
import {
  emptySerialRangeForm,
  SerialRangeFields,
  type SerialRangeFormValues,
} from "@/components/ui/serial-range-fields";
import {
  emptySealForm,
  SEAL_COLOR_LABELS,
  SEAL_STATUS_LABELS,
  type SealFormValues,
} from "@/lib/seal-form";
import { buildSerialRange } from "@/lib/serial-range";
import { SEAL_COLORS, SEAL_STATUSES } from "@/types/seal";

export type SealBatchSubmitPayload = {
  serials: string[];
  base: Omit<SealFormValues, "serial">;
};

type SealBatchFormDialogProps = {
  open: boolean;
  saving: boolean;
  progress: { done: number; total: number } | null;
  error: string | null;
  printerOptions: PrinterSelectOption[];
  printersLoading: boolean;
  onClose: () => void;
  onSubmit: (payload: SealBatchSubmitPayload) => void;
};

export function SealBatchFormDialog({
  open,
  saving,
  progress,
  error,
  printerOptions,
  printersLoading,
  onClose,
  onSubmit,
}: SealBatchFormDialogProps) {
  const [range, setRange] = useState<SerialRangeFormValues>(emptySerialRangeForm());
  const [form, setForm] = useState<Omit<SealFormValues, "serial">>(emptySealForm());

  useEffect(() => {
    if (!open) return;
    setRange(emptySerialRangeForm());
    setForm(emptySealForm());
  }, [open]);

  const disabled = saving || printersLoading;
  const busy = saving;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const serials = buildSerialRange(range, { mode: "seal" });
    if (typeof serials === "string") return;
    onSubmit({ serials, base: form });
  }

  return (
    <BatchFormDialog
      open={open}
      title="Crear precintos por lote"
      error={error}
      progress={progress}
      busy={busy}
      submitDisabled={disabled}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <SerialRangeFields
        mode="seal"
        values={range}
        onChange={setRange}
        disabled={disabled}
      />

      <BatchFormStepSection
        title="Mismos valores para todo el lote"
        description="Color, estatus e impresora opcional se aplican a cada precinto generado. Si el estatus es «En impresora», asigna la impresora correspondiente."
      >
        <div className="block">
          <span className="mb-1.5 block text-sm font-medium">Impresora (opcional)</span>
          {printerOptions.length > 0 ? (
            <PrinterSelect
              value={form.printerId}
              onChange={(printerId) => setForm((f) => ({ ...f, printerId }))}
              options={printerOptions}
              disabled={disabled}
              loading={printersLoading}
            />
          ) : (
            <input
              type="number"
              min={1}
              value={form.printerId}
              disabled={disabled}
              onChange={(e) =>
                setForm((f) => ({ ...f, printerId: e.target.value }))
              }
              className={BATCH_FORM_INPUT_CLASS}
              placeholder="ID de impresora"
            />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Color</span>
            <select
              required
              value={form.color}
              disabled={disabled}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  color: e.target.value as SealFormValues["color"],
                }))
              }
              className={BATCH_FORM_INPUT_CLASS}
            >
              {SEAL_COLORS.map((color) => (
                <option key={color} value={color}>
                  {SEAL_COLOR_LABELS[color]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Estatus</span>
            <select
              required
              value={form.status}
              disabled={disabled}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as SealFormValues["status"],
                }))
              }
              className={BATCH_FORM_INPUT_CLASS}
            >
              {SEAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {SEAL_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </BatchFormStepSection>
    </BatchFormDialog>
  );
}
