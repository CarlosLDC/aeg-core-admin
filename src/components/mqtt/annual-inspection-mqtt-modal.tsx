"use client";

import { Loader2, RefreshCw, X } from "lucide-react";
import {
  ANNUAL_INSPECTION_CHECKLIST_ROWS,
  type AnnualInspectionChecklistKey,
  type AnnualInspectionChecklistState,
} from "@/lib/annual-inspection-mqtt-state";
import { invoiceProductDescriptionLimitLabel } from "@/lib/enajenacion-mqtt-protocol";
import { formFieldInputClass, formFieldTextareaClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";

type AnnualInspectionMqttModalProps = {
  open: boolean;
  registroImpresora: string;
  numeroFacturaPrueba: number | null;
  productDescription: string;
  onProductDescriptionChange: (value: string) => void;
  checklist: AnnualInspectionChecklistState;
  onChecklistChange: (key: AnnualInspectionChecklistKey, checked: boolean) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onSendTestInvoice: () => void;
  sendingTestInvoice: boolean;
  onSendTestCreditNote: () => void;
  sendingTestCreditNote: boolean;
  creditNoteDisabled?: boolean;
  creditNoteDisabledReason?: string | null;
  onSubmitInspection: () => void;
  submittingInspection: boolean;
  error?: string | null;
  onClose: () => void;
};

export function AnnualInspectionMqttModal({
  open,
  registroImpresora,
  numeroFacturaPrueba,
  productDescription,
  onProductDescriptionChange,
  checklist,
  onChecklistChange,
  onRefresh,
  refreshing,
  onSendTestInvoice,
  sendingTestInvoice,
  onSendTestCreditNote,
  sendingTestCreditNote,
  creditNoteDisabled = false,
  creditNoteDisabledReason,
  onSubmitInspection,
  submittingInspection,
  error,
  onClose,
}: AnnualInspectionMqttModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="annual-inspection-mqtt-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              id="annual-inspection-mqtt-title"
              className="text-lg font-semibold text-card-foreground"
            >
              Inspección anual obligatoria
            </h2>
            <p className="mt-1 text-sm text-muted">
              Marque el checklist manualmente o deje que se marque tras pruebas exitosas.
              Enviar inspección solo usa el estado actual de los cinco checkboxes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-foreground/5"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1">
              <span className="mb-1.5 block text-sm font-medium">Registro de impresora</span>
              <input
                type="text"
                readOnly
                value={registroImpresora}
                className={cn(
                  formFieldInputClass,
                  "bg-foreground/[0.02] font-mono text-card-foreground",
                )}
              />
            </label>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className={cn(
                "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-foreground/5",
                refreshing && "cursor-not-allowed opacity-70",
              )}
            >
              {refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Actualizar
            </button>
          </div>

          {numeroFacturaPrueba != null ? (
            <p className="text-sm text-card-foreground">
              <span className="text-muted">Número de factura de prueba:</span>{" "}
              <span className="font-mono font-semibold">{numeroFacturaPrueba}</span>
            </p>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Descripción de producto (des01)
            </span>
            <textarea
              value={productDescription}
              onChange={(event) => onProductDescriptionChange(event.target.value)}
              rows={3}
              className={formFieldTextareaClass}
            />
            <span className="mt-1 block text-xs text-muted">
              {invoiceProductDescriptionLimitLabel(productDescription)} Se usa en la factura y
              nota de crédito de prueba.
            </span>
          </label>

          <div className="space-y-4">
            {ANNUAL_INSPECTION_CHECKLIST_ROWS.map((row) => (
              <fieldset
                key={row.key}
                className="space-y-2 rounded-lg border border-border px-3 py-3"
              >
                <legend className="text-sm font-medium text-card-foreground">
                  {row.title}
                </legend>
                <label className="flex items-center gap-3">
                  <input
                    id={`annual-inspection-${row.key}-ok`}
                    type="radio"
                    name={`annual-inspection-${row.key}`}
                    checked={checklist[row.key]}
                    onChange={() => onChecklistChange(row.key, true)}
                    className="size-4 shrink-0 border-border text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-card-foreground">{row.okLabel}</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    id={`annual-inspection-${row.key}-not-ok`}
                    type="radio"
                    name={`annual-inspection-${row.key}`}
                    checked={!checklist[row.key]}
                    onChange={() => onChecklistChange(row.key, false)}
                    className="size-4 shrink-0 border-border text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-card-foreground">{row.notOkLabel}</span>
                </label>
                {row.action === "test-invoice" ? (
                  <button
                    type="button"
                    onClick={onSendTestInvoice}
                    disabled={sendingTestInvoice}
                    className={cn(
                      "rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-foreground/5",
                      sendingTestInvoice && "cursor-not-allowed opacity-70",
                    )}
                  >
                    {sendingTestInvoice ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="size-3.5 animate-spin" />
                        Enviando…
                      </span>
                    ) : (
                      "Enviar Factura de Prueba"
                    )}
                  </button>
                ) : null}
                {row.action === "test-credit-note" ? (
                  <button
                    type="button"
                    onClick={onSendTestCreditNote}
                    disabled={sendingTestCreditNote || creditNoteDisabled}
                    title={creditNoteDisabledReason ?? undefined}
                    className={cn(
                      "rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-foreground/5",
                      (sendingTestCreditNote || creditNoteDisabled) &&
                        "cursor-not-allowed opacity-70",
                    )}
                  >
                    {sendingTestCreditNote ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Loader2 className="size-3.5 animate-spin" />
                        Enviando…
                      </span>
                    ) : (
                      "Enviar Nota de Crédito de Prueba"
                    )}
                  </button>
                ) : null}
              </fieldset>
            ))}
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-950 dark:text-rose-100"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onSubmitInspection}
            disabled={submittingInspection}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground",
              submittingInspection && "cursor-not-allowed opacity-70",
            )}
          >
            {submittingInspection ? <Loader2 className="size-4 animate-spin" /> : null}
            Enviar Inspección Anual Obligatoria
          </button>
        </div>
      </div>
    </div>
  );
}
