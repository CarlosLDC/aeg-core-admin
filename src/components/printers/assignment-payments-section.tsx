"use client";

import { Plus, Trash2 } from "lucide-react";
import { PaymentReceiptScan } from "@/components/commercial-payments/payment-receipt-scan";
import { FieldLabel } from "@/components/ui/field-label";
import { NativeSelect } from "@/components/ui/native-select";
import { todayIsoDate } from "@/lib/datetime-form";
import {
  COMMERCIAL_PAYMENT_METHOD_LABELS,
} from "@/lib/commercial-payment-form";
import type { PaymentExtractResult } from "@/lib/payment-extract";
import type { AssignmentPaymentDraft } from "@/lib/printer-assignment-wizard";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import {
  COMMERCIAL_PAYMENT_METHODS,
  type CommercialPaymentMethod,
} from "@/types/commercial-payment";

type AssignmentPaymentsSectionProps = {
  drafts: AssignmentPaymentDraft[];
  disabled?: boolean;
  onChange: (drafts: AssignmentPaymentDraft[]) => void;
};

function emptyDraft(key: string): AssignmentPaymentDraft {
  return {
    key,
    mode: "choose",
    metodoBanco: "BNC",
    referencia: "",
    monto: "",
    cuentaDestino: "",
    fechaPago: todayIsoDate(),
    notas: "",
  };
}

export function AssignmentPaymentsSection({
  drafts,
  disabled = false,
  onChange,
}: AssignmentPaymentsSectionProps) {
  const rows = drafts;

  function update(next: AssignmentPaymentDraft[]) {
    onChange(next);
  }

  function patch(key: string, partial: Partial<AssignmentPaymentDraft>) {
    update(rows.map((row) => (row.key === key ? { ...row, ...partial } : row)));
  }

  function applyExtracted(key: string, data: PaymentExtractResult) {
    patch(key, {
      mode: "manual",
      metodoBanco: data.metodoBanco ?? "BNC",
      monto: data.monto != null ? String(data.monto) : "",
      referencia: data.referencia ?? "",
      cuentaDestino: data.cuentaDestino ?? "",
      fechaPago: data.fechaPago ?? todayIsoDate(),
    });
  }

  return (
    <fieldset className="space-y-3 rounded-xl border border-border p-4">
      <legend className="px-1 text-sm font-semibold text-card-foreground">
        Pagos
      </legend>
      <p className="text-xs text-muted">
        Opcional. Puedes registrar varios pagos ahora o dejar la orden sin abonos.
      </p>

      {rows.map((row, index) => (
        <div
          key={row.key}
          className="space-y-3 rounded-lg border border-border bg-foreground/[0.02] p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-card-foreground">
              Pago {index + 1}
            </p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => update(rows.filter((item) => item.key !== row.key))}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-400"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Quitar
            </button>
          </div>

          {row.mode !== "manual" ? (
            <PaymentReceiptScan
              disabled={disabled}
              onExtracted={(data) => applyExtracted(row.key, data)}
              onRequestManual={() => patch(row.key, { mode: "manual" })}
            />
          ) : (
            <div className="space-y-3">
              <PaymentReceiptScan
                disabled={disabled}
                onExtracted={(data) => applyExtracted(row.key, data)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <FieldLabel required>Método / banco</FieldLabel>
                  <NativeSelect
                    required
                    value={row.metodoBanco}
                    disabled={disabled}
                    onChange={(e) =>
                      patch(row.key, {
                        metodoBanco: e.target.value as CommercialPaymentMethod,
                      })
                    }
                  >
                    {COMMERCIAL_PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {COMMERCIAL_PAYMENT_METHOD_LABELS[method]}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <label className="block">
                  <FieldLabel>Monto</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={row.monto}
                    disabled={disabled}
                    onChange={(e) => patch(row.key, { monto: e.target.value })}
                    className={cn(formFieldInputClass, "font-mono")}
                    placeholder="0.00"
                  />
                </label>
                <label className="block">
                  <FieldLabel>Fecha de pago</FieldLabel>
                  <input
                    type="date"
                    value={row.fechaPago}
                    disabled={disabled}
                    onChange={(e) => patch(row.key, { fechaPago: e.target.value })}
                    className={formFieldInputClass}
                  />
                </label>
                <label className="block">
                  <FieldLabel>Referencia</FieldLabel>
                  <input
                    type="text"
                    maxLength={100}
                    value={row.referencia}
                    disabled={disabled}
                    onChange={(e) => patch(row.key, { referencia: e.target.value })}
                    className={cn(formFieldInputClass, "font-mono")}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <FieldLabel>Cuenta destino</FieldLabel>
                  <input
                    type="text"
                    maxLength={100}
                    value={row.cuentaDestino}
                    disabled={disabled}
                    onChange={(e) =>
                      patch(row.key, { cuentaDestino: e.target.value })
                    }
                    className={formFieldInputClass}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <FieldLabel>Notas</FieldLabel>
                  <input
                    type="text"
                    maxLength={500}
                    value={row.notas}
                    disabled={disabled}
                    onChange={(e) => patch(row.key, { notas: e.target.value })}
                    className={formFieldInputClass}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          update([
            ...rows,
            emptyDraft(`payment-${Date.now()}-${rows.length}`),
          ])
        }
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-50"
      >
        <Plus className="size-4" aria-hidden />
        Añadir pago
      </button>
    </fieldset>
  );
}
