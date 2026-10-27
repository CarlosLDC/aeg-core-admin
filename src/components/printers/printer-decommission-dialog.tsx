"use client";

import { useId, useState, type FormEvent } from "react";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import {
  DECOMMISSION_REASON_LABELS,
  isDecommissionReason,
  validateDecommissionDate,
} from "@/lib/decommission";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import {
  DECOMMISSION_REASONS,
  type DecommissionReason,
  type DecommissionRequest,
} from "@/types/decommission";
import type { PrinterResponse } from "@/types/printer";

type PrinterDecommissionDialogProps = {
  printer: PrinterResponse;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: DecommissionRequest) => void;
};

export function PrinterDecommissionDialog({
  printer,
  saving,
  error,
  onClose,
  onSubmit,
}: PrinterDecommissionDialogProps) {
  const titleId = useId();
  const [reason, setReason] = useState<DecommissionReason>("DESUSO");
  const [date, setDate] = useState("");
  const [ownPrinter, setOwnPrinter] = useState(false);
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const dateError = validateDecommissionDate(date);
    if (dateError) {
      setFieldError(dateError);
      return;
    }
    setFieldError(null);
    onSubmit({
      reason,
      date: date.trim() || null,
      ownPrinter,
      notes: notes.trim() || null,
    });
  }

  return (
    <PrinterActionDialogShell
      title="Desincorporar impresora"
      titleId={titleId}
      printer={printer}
      saving={saving}
      error={fieldError ?? error}
      onClose={onClose}
      submitLabel="Desincorporar"
      submitDestructive
      onSubmit={handleSubmit}
    >
      <div className="space-y-4 overflow-y-auto">
        <p className="text-sm text-muted">
          La impresora pasará al estatus Desincorporada y quedará registrada
          para la declaración informativa al SENIAT.
        </p>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-card-foreground">Motivo</span>
          <select
            className={formFieldInputClass}
            value={reason}
            disabled={saving}
            onChange={(e) => {
              if (isDecommissionReason(e.target.value)) setReason(e.target.value);
            }}
          >
            {DECOMMISSION_REASONS.map((value) => (
              <option key={value} value={value}>
                {DECOMMISSION_REASON_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-card-foreground">
            Fecha (opcional)
          </span>
          <input
            type="date"
            className={formFieldInputClass}
            value={date}
            disabled={saving}
            onChange={(e) => setDate(e.target.value)}
          />
          <span className="text-xs text-muted">
            Si la dejas vacía se usa la fecha de hoy.
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ownPrinter}
            disabled={saving}
            onChange={(e) => setOwnPrinter(e.target.checked)}
          />
          <span className="text-card-foreground">
            Es una máquina de nuestra propiedad
          </span>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-card-foreground">
            Observaciones (opcional)
          </span>
          <textarea
            className={`${formFieldInputClass} min-h-24 py-2`}
            value={notes}
            disabled={saving}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>
    </PrinterActionDialogShell>
  );
}
