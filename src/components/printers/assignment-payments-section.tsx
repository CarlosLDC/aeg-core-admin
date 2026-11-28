"use client";

import { useEffect, useId, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { CommercialPaymentMethodBadge } from "@/components/commercial-payments/commercial-payment-method-badge";
import { PaymentReceiptScan } from "@/components/commercial-payments/payment-receipt-scan";
import { FieldLabel, RequiredFieldsLegend } from "@/components/ui/field-label";
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
  createEmptyAssignmentPaymentDraft,
  sumAssignmentPaymentAmounts,
  validateAssignmentPaymentDraft,
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
  disabled?: boolean;
  onChange: (payments: AssignmentPaymentDraft[]) => void;
};

type PaymentModalState = {
  editingKey: string | null;
  fromScan: boolean;
  draft: AssignmentPaymentDraft;
};

export function AssignmentPaymentsSection({
  payments,
  disabled = false,
  onChange,
}: AssignmentPaymentsSectionProps) {
  const modalTitleId = useId();
  const [scanSession, setScanSession] = useState(0);
  const [modal, setModal] = useState<PaymentModalState | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const { total, countWithAmount } = sumAssignmentPaymentAmounts(payments);

  useEffect(() => {
    if (!modal) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setModal(null);
        setModalError(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal]);

  function openManualModal() {
    setModalError(null);
    setModal({
      editingKey: null,
      fromScan: false,
      draft: createEmptyAssignmentPaymentDraft("modal"),
    });
  }

  function openScannedModal(data: PaymentExtractResult) {
    const empty = createEmptyAssignmentPaymentDraft("modal");
    setModalError(null);
    setModal({
      editingKey: null,
      fromScan: true,
      draft: {
        ...empty,
        metodoBanco: data.metodoBanco ?? empty.metodoBanco,
        monto: data.monto != null ? String(data.monto) : "",
        referencia: data.referencia ?? "",
        cuentaDestino: data.cuentaDestino ?? "",
        fechaPago: data.fechaPago ?? todayIsoDate(),
      },
    });
  }

  function openEditModal(row: AssignmentPaymentDraft) {
    setModalError(null);
    setModal({
      editingKey: row.key,
      fromScan: false,
      draft: { ...row },
    });
  }

  function closeModal() {
    setModal(null);
    setModalError(null);
  }

  function patchModalDraft(partial: Partial<AssignmentPaymentDraft>) {
    setModalError(null);
    setModal((prev) =>
      prev ? { ...prev, draft: { ...prev.draft, ...partial } } : null,
    );
  }

  function handleSaveModal() {
    if (!modal) return;
    const validated = validateAssignmentPaymentDraft(modal.draft, {
      requireDetails: true,
    });
    if (typeof validated === "string") {
      setModalError(validated);
      return;
    }

    if (modal.editingKey) {
      onChange(
        payments.map((row) =>
          row.key === modal.editingKey
            ? { ...modal.draft, key: modal.editingKey, mode: "manual" }
            : row,
        ),
      );
    } else {
      onChange([
        ...payments,
        {
          ...modal.draft,
          key: `payment-${Date.now()}-${payments.length}`,
          mode: "manual",
        },
      ]);
    }

    setScanSession((prev) => prev + 1);
    closeModal();
  }

  return (
    <div className="space-y-4">
      <PaymentReceiptScan
        key={scanSession}
        disabled={disabled}
        onExtracted={openScannedModal}
        onRequestManual={openManualModal}
      />

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
          <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted">
            Todavía no hay pagos en la lista. Escanea un comprobante o agrégalo
            manualmente, o continúa para crear la orden sin abonos.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {payments.map((row, index) => {
              const parsedAmount = parseNonNegativeDecimal(row.monto);
              const amountLabel =
                typeof parsedAmount === "number"
                  ? formatMoney(parsedAmount)
                  : "Sin monto";
              const metaParts = [
                row.fechaPago.trim() ? formatDate(row.fechaPago) : null,
                row.referencia.trim() ? `Ref. ${row.referencia.trim()}` : null,
                row.cuentaDestino.trim() ? row.cuentaDestino.trim() : null,
              ].filter(Boolean);

              return (
                <li
                  key={row.key}
                  className="rounded-xl border border-border bg-card p-3.5 transition-colors sm:p-3"
                >
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted">
                          #{index + 1}
                        </span>
                        <CommercialPaymentMethodBadge method={row.metodoBanco} />
                        <span
                          className={cn(
                            "ml-auto font-mono text-sm font-semibold sm:ml-0",
                            typeof parsedAmount === "number"
                              ? "text-card-foreground"
                              : "text-muted",
                          )}
                        >
                          {amountLabel}
                        </span>
                      </div>

                      {metaParts.length > 0 ? (
                        <p className="break-words text-xs leading-relaxed text-muted">
                          {metaParts.join(" · ")}
                        </p>
                      ) : null}

                      {row.notas.trim() ? (
                        <p className="line-clamp-2 break-words text-xs text-muted/90">
                          {row.notas.trim()}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-2 sm:flex sm:shrink-0 sm:items-center sm:gap-1 sm:border-t-0 sm:pt-0">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => openEditModal(row)}
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-foreground/[0.03] px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-foreground/5 hover:text-card-foreground disabled:opacity-50 sm:min-h-8 sm:bg-transparent sm:px-2 sm:py-1"
                        aria-label={`Editar pago ${index + 1}`}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          onChange(payments.filter((item) => item.key !== row.key))
                        }
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-500/[0.06] px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-400 sm:min-h-8 sm:bg-transparent sm:px-2 sm:py-1"
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

      {modal ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Cerrar modal de pago"
            onClick={closeModal}
          />
          <div className="relative flex max-h-[min(94dvh,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl sm:max-h-[min(92vh,100dvh)]">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-3.5">
              <div className="min-w-0">
                <h3
                  id={modalTitleId}
                  className="text-base font-semibold leading-snug text-card-foreground sm:text-lg"
                >
                  {modal.editingKey
                    ? "Editar pago"
                    : modal.fromScan
                      ? "Verificar pago escaneado"
                      : "Añadir pago"}
                </h3>
                <p className="mt-0.5 text-xs text-muted sm:text-sm">
                  {modal.editingKey
                    ? "Actualiza los datos del pago en la lista."
                    : modal.fromScan
                      ? "Revisa o corrige los datos extraídos por la IA antes de añadirlo."
                      : "Ingresa los detalles del pago para añadirlo a la lista."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="-mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-foreground/5"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div
              className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-3.5 sm:px-6 sm:py-4"
              style={{ touchAction: "pan-y" }}
            >
              {modal.fromScan ? (
                <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                  Comprobante analizado. Verifica los campos y pulsa «Añadir a la
                  lista».
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <FieldLabel required>Método / banco</FieldLabel>
                  <NativeSelect
                    value={modal.draft.metodoBanco}
                    onChange={(e) =>
                      patchModalDraft({
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
                    value={modal.draft.monto}
                    onChange={(e) => patchModalDraft({ monto: e.target.value })}
                    className={cn(formFieldInputClass, "font-mono")}
                    placeholder="0.00"
                  />
                </label>

                <label className="block">
                  <FieldLabel>Fecha de pago</FieldLabel>
                  <input
                    type="date"
                    value={modal.draft.fechaPago}
                    onChange={(e) =>
                      patchModalDraft({ fechaPago: e.target.value })
                    }
                    className={formFieldInputClass}
                  />
                </label>

                <label className="block">
                  <FieldLabel>Referencia</FieldLabel>
                  <input
                    type="text"
                    maxLength={100}
                    value={modal.draft.referencia}
                    onChange={(e) =>
                      patchModalDraft({ referencia: e.target.value })
                    }
                    className={cn(formFieldInputClass, "font-mono")}
                    placeholder="Ej. 004198"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <FieldLabel>Cuenta destino</FieldLabel>
                  <input
                    type="text"
                    maxLength={100}
                    value={modal.draft.cuentaDestino}
                    onChange={(e) =>
                      patchModalDraft({ cuentaDestino: e.target.value })
                    }
                    className={formFieldInputClass}
                    placeholder="Cuenta, correo Zelle o wallet"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <FieldLabel>Notas</FieldLabel>
                  <input
                    type="text"
                    maxLength={500}
                    value={modal.draft.notas}
                    onChange={(e) => patchModalDraft({ notas: e.target.value })}
                    className={formFieldInputClass}
                    placeholder="Observaciones opcionales"
                  />
                </label>
              </div>

              {modalError ? (
                <p
                  role="alert"
                  className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
                >
                  {modalError}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-border px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col gap-3">
                <RequiredFieldsLegend />
                <div className="flex items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-border/70 px-4 text-sm font-medium text-muted hover:bg-foreground/5 sm:h-10 sm:border-transparent"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveModal}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground sm:h-10 sm:flex-initial"
                  >
                    {modal.editingKey ? (
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
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
