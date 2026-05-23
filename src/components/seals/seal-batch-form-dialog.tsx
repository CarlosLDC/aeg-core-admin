"use client";

import { FormEvent, useEffect, useState } from "react";
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
  onClose: () => void;
  onSubmit: (payload: SealBatchSubmitPayload) => void;
};

export function SealBatchFormDialog({
  open,
  saving,
  progress,
  error,
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

  const disabled = saving;
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
      description="Genera varios precintos consecutivos en una sola operación."
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

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-card-foreground">
          Datos comunes
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <FieldLabel required>Color</FieldLabel>
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
          <FieldLabel required>Estatus</FieldLabel>
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
      </div>
    </BatchFormDialog>
  );
}
