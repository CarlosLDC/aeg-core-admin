"use client";

import { useState } from "react";
import { Check, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { CommercialPaymentMethodBadge } from "@/components/commercial-payments/commercial-payment-method-badge";
import { PaymentReceiptScan } from "@/components/commercial-payments/payment-receipt-scan";
import { FieldLabel } from "@/components/ui/field-label";
import { NativeSelect } from "@/components/ui/native-select";
import { COMMERCIAL_PAYMENT_METHOD_LABELS } from "@/lib/commercial-payment-form";
import {
  formatDate,
  formatMoney,
  parseNonNegativeDecimal,
  todayIsoDate,
} from "@/lib/datetime-form";
import type { PaymentExtractResult } from "@/lib/payment-extract";
import {
  hasAssignmentPaymentDetails,
  sumAssignmentPaymentAmounts,
  type AssignmentPaymentDraft,
} from "@/lib/printer-assignment-wizard";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import {
  COMMERCIAL_PAYMENT_METHODS,
  type CommercialPaymentMethod,
} from "@/types/commercial-payment";

type AssignmentPaymentsSectionProps = {
  payments: AssignmentPaymentDraft[];
  composerDraft: AssignmentPaymentDraft;
  editingKey: string | null;
  disabled?: boolean;
  composerError?: string | null;
  onComposerChange: (draft: AssignmentPaymentDraft) => void;
  onAddOrSavePayment: () => void;
  onEditPayment: (key: string) => void;
  onCancelEdit: () => void;
  onClearComposer: () => void;
  onRemovePayment: (key: string) => void;
};

export function AssignmentPaymentsSection({
  payments,
  composerDraft,
  editingKey,
  disabled = false,
  composerError = null,
  onComposerChange,
  onAddOrSavePayment,
  onEditPayment,
  onCancelEdit,
  onClearComposer,
  onRemovePayment,
}: AssignmentPaymentsSectionProps) {
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [scanSession, setScanSession] = useState(0);

  const isEditing = editingKey !== null;
  const hasDetails = hasAssignmentPaymentDetails(composerDraft);
  const { total, countWithAmount } = sumAssignmentPaymentAmounts(payments);

  function patchComposer(partial: Partial<AssignmentPaymentDraft>) {
    setScanNotice(null);
    onComposerChange({ ...composerDraft, ...partial });
  }

  function handleExtracted(data: PaymentExtractResult) {
    onComposerChange({
      ...composerDraft,
      mode: "manual",
      metodoBanco: data.metodoBanco ?? composerDraft.metodoBanco,
      monto: data.monto != null ? String(data.monto) : composerDraft.monto,
      referencia: data.referencia ?? composerDraft.referencia,
      cuentaDestino: data.cuentaDestino ?? composerDraft.cuentaDestino,
      fechaPago: data.fechaPago ?? (composerDraft.fechaPago || todayIsoDate()),
    });
    setScanNotice(
      isEditing
        ? "Datos extraídos del comprobante. Verifica y guarda los cambios."
        : "Datos extraídos del comprobante. Verifica y pulsa «Añadir a la lista».",
    );
  }

  function handleAddOrSave() {
    setScanNotice(null);
    setScanSession((prev) => prev + 1);
    onAddOrSavePayment();
  }

  function handleClear() {
    setScanNotice(null);
    setScanSession((prev) => prev + 1);
    onClearComposer();
  }

  function handleCancelEdit() {
    setScanNotice(null);
    setScanSession((prev) => prev + 1);
    onCancelEdit();
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-3 rounded-xl border border-border bg-foreground/[0.02] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="px-1 text-sm font-semibold text-card-foreground">
            {isEditing ? "Editar pago" : "Registrar pago"}
          </legend>
          {isEditing ? (
            <button
              type="button"
              disabled={disabled}
              onClick={handleCancelEdit}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
            >
              Cancelar edición
            </button>
          ) : hasDetails ? (
            <button
              type="button"
              disabled={disabled}
              onClick={handleClear}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Limpiar
            </button>
          ) : null}
        </div>

        <PaymentReceiptScan
          key={scanSession}
          disabled={disabled}
          onExtracted={handleExtracted}
        />

        {scanNotice ? (
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            {scanNotice}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <FieldLabel required>Método / banco</FieldLabel>
            <NativeSelect
              value={composerDraft.metodoBanco}
              disabled={disabled}
              onChange={(e) =>
                patchComposer({
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
              value={composerDraft.monto}
              disabled={disabled}
              onChange={(e) => patchComposer({ monto: e.target.value })}
              className={cn(formFieldInputClass, "font-mono")}
              placeholder="0.00"
            />
          </label>

          <label className="block">
            <FieldLabel>Fecha de pago</FieldLabel>
            <input
              type="date"
              value={composerDraft.fechaPago}
              disabled={disabled}
              onChange={(e) => patchComposer({ fechaPago: e.target.value })}
              className={formFieldInputClass}
            />
          </label>

          <label className="block">
            <FieldLabel>Referencia</FieldLabel>
            <input
              type="text"
              maxLength={100}
              value={composerDraft.referencia}
              disabled={disabled}
              onChange={(e) => patchComposer({ referencia: e.target.value })}
              className={cn(formFieldInputClass, "font-mono")}
              placeholder="Ej. 004198"
            />
          </label>

          <label className="block sm:col-span-2">
            <FieldLabel>Cuenta destino</FieldLabel>
            <input
              type="text"
              maxLength={100}
              value={composerDraft.cuentaDestino}
              disabled={disabled}
              onChange={(e) => patchComposer({ cuentaDestino: e.target.value })}
              className={formFieldInputClass}
              placeholder="Cuenta, correo Zelle o wallet"
            />
          </label>

          <label className="block sm:col-span-2">
            <FieldLabel>Notas</FieldLabel>
            <input
              type="text"
              maxLength={500}
              value={composerDraft.notas}
              disabled={disabled}
              onChange={(e) => patchComposer({ notas: e.target.value })}
              className={formFieldInputClass}
              placeholder="Observaciones opcionales"
            />
          </label>
        </div>

        {composerError ? (
          <p
            role="alert"
            className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
          >
            {composerError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={disabled}
            onClick={handleAddOrSave}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              "bg-accent/12 text-accent hover:bg-accent/20 disabled:opacity-50",
            )}
          >
            {isEditing ? (
              <>
                <Check className="size-4" aria-hidden />
                Guardar cambios
              </>
            ) : (
              <>
                <Plus className="size-4" aria-hidden />
                Añadir a la lista
              </>
            )}
          </button>
        </div>
      </fieldset>

      <section className="space-y-2.5" aria-label="Lista de pagos añadidos">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-card-foreground">
            Pagos añadidos{" "}
            <span className="font-normal text-muted">({payments.length})</span>
          </h3>
          {countWithAmount > 0 ? (
            <span className="font-mono text-xs font-semibold text-card-foreground">
              Total: {formatMoney(total)}
            </span>
          ) : null}
        </div>

        {payments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-xs text-muted">
            Todavía no hay pagos en la lista. Añade uno arriba o continúa para
            crear la orden sin abonos.
          </p>
        ) : (
          <ul className="space-y-2">
            {payments.map((row, index) => {
              const parsedAmount = parseNonNegativeDecimal(row.monto);
              const amountLabel =
                typeof parsedAmount === "number"
                  ? formatMoney(parsedAmount)
                  : "Sin monto";
              const isRowEditing = editingKey === row.key;
              const metaParts = [
                row.fechaPago.trim() ? formatDate(row.fechaPago) : null,
                row.referencia.trim() ? `Ref. ${row.referencia.trim()}` : null,
                row.cuentaDestino.trim() ? row.cuentaDestino.trim() : null,
              ].filter(Boolean);

              return (
                <li
                  key={row.key}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    isRowEditing
                      ? "border-accent bg-accent/5"
                      : "border-border bg-card",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted">
                          #{index + 1}
                        </span>
                        <CommercialPaymentMethodBadge method={row.metodoBanco} />
                        <span
                          className={cn(
                            "font-mono text-sm font-semibold",
                            typeof parsedAmount === "number"
                              ? "text-card-foreground"
                              : "text-muted",
                          )}
                        >
                          {amountLabel}
                        </span>
                      </div>

                      {metaParts.length > 0 ? (
                        <p className="truncate text-xs text-muted">
                          {metaParts.join(" · ")}
                        </p>
                      ) : null}

                      {row.notas.trim() ? (
                        <p className="line-clamp-2 text-xs text-muted/90">
                          {row.notas.trim()}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setScanNotice(null);
                          setScanSession((prev) => prev + 1);
                          onEditPayment(row.key);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-foreground/5 hover:text-card-foreground disabled:opacity-50"
                        aria-label={`Editar pago ${index + 1}`}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (isRowEditing) {
                            setScanNotice(null);
                            setScanSession((prev) => prev + 1);
                          }
                          onRemovePayment(row.key);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-400"
                        aria-label={`Quitar pago ${index + 1}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        Quitar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
