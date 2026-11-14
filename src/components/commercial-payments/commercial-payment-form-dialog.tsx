"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import { Banknote, Loader2, ReceiptText, X } from "lucide-react";
import { CommercialInvoiceCollectionStatusBadge } from "@/components/commercial-invoices/commercial-invoice-badges";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooterBar } from "@/components/ui/form-dialog-footer";
import { NativeSelect } from "@/components/ui/native-select";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { formatCommercialInvoiceTitle } from "@/lib/commercial-invoice-form";
import {
  COMMERCIAL_PAYMENT_METHOD_LABELS,
  commercialPaymentToFormValues,
  emptyCommercialPaymentForm,
} from "@/lib/commercial-payment-form";
import { zodFieldErrors } from "@/lib/form-zod";
import { commercialPaymentFormSchema } from "@/lib/schemas/commercial-payment-form-schema";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import type { CommercialInvoiceResponse } from "@/types/commercial-invoice";
import {
  COMMERCIAL_PAYMENT_METHODS,
  type CommercialPaymentFormValues,
  type CommercialPaymentResponse,
} from "@/types/commercial-payment";

type CommercialPaymentFormDialogProps = {
  mode: "create" | "edit";
  payment?: CommercialPaymentResponse;
  defaultInvoiceId?: number | null;
  lockInvoice?: boolean;
  invoices: CommercialInvoiceResponse[];
  invoicesLoading?: boolean;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: CommercialPaymentFormValues) => void;
};

type WizardStep = 1 | 2;

const FORM_STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "Factura y método" },
  { step: 2, label: "Detalles del pago" },
];

const STEP_ICONS = {
  1: ReceiptText,
  2: Banknote,
} as const;

function stepSubtitle(step: WizardStep): string {
  switch (step) {
    case 1:
      return "Factura comercial asociada y método / banco utilizado.";
    case 2:
      return "Monto abonado, número de referencia y cuenta destino.";
  }
}

function CommercialPaymentFormDialogContent({
  mode,
  payment,
  defaultInvoiceId,
  lockInvoice = false,
  invoices,
  invoicesLoading = false,
  saving,
  error,
  onClose,
  onSubmit,
}: Omit<CommercialPaymentFormDialogProps, "open">) {
  const formId = useId();
  const titleId = useId();
  const [form, setForm] = useState<CommercialPaymentFormValues>(() =>
    mode === "edit" && payment
      ? commercialPaymentToFormValues(payment)
      : emptyCommercialPaymentForm(defaultInvoiceId),
  );
  const [step, setStep] = useState<WizardStep>(1);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CommercialPaymentFormValues, string>>
  >({});

  const invoiceOptions: SearchableSelectOption[] = useMemo(
    () =>
      invoices.map((inv) => ({
        value: String(inv.id),
        label: formatCommercialInvoiceTitle(inv),
        description: inv.clienteComercialNombre ?? undefined,
        badge: (
          <CommercialInvoiceCollectionStatusBadge status={inv.estadoCobro} />
        ),
        searchText: [
          String(inv.id),
          inv.numeroFactura,
          inv.sufijoControl,
          inv.clienteComercialNombre,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [invoices],
  );

  function goToStep(target: WizardStep) {
    setFieldErrors({});
    setStep(target);
  }

  function goNext() {
    const parsed = commercialPaymentFormSchema.safeParse(form);
    const errors = zodFieldErrors(parsed);
    if (errors && (errors.facturaComercialId || errors.metodoBanco)) {
      setFieldErrors({
        facturaComercialId: errors.facturaComercialId,
        metodoBanco: errors.metodoBanco,
      });
      return;
    }
    setFieldErrors({});
    setStep(2);
  }

  function goBack() {
    setFieldErrors({});
    setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : 1));
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < 2) {
      goNext();
      return;
    }
    const parsed = commercialPaymentFormSchema.safeParse(form);
    const errors = zodFieldErrors(parsed);
    if (errors) {
      setFieldErrors(errors);
      if (errors.facturaComercialId || errors.metodoBanco) {
        setStep(1);
      }
      return;
    }
    if (!parsed.success) return;
    setFieldErrors({});
    onSubmit(form);
  }

  const inputClass = formFieldInputClass;
  const disabled = saving || invoicesLoading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(92vh,100dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id={titleId}
                className="text-base font-semibold leading-snug text-card-foreground sm:text-lg"
              >
                {mode === "create"
                  ? "Nuevo pago comercial"
                  : "Editar pago comercial"}
              </h2>
              <p className="mt-1 text-sm text-muted">{stepSubtitle(step)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="mt-4 flex gap-1" aria-label="Pasos del registro">
            {FORM_STEPS.map(({ step: s, label }) => {
              const Icon = STEP_ICONS[s];
              const isActive = step === s;
              const isDone = step > s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={saving}
                  onClick={() => goToStep(s)}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition-colors",
                    "hover:bg-foreground/5 disabled:opacity-50",
                    isActive && "bg-accent/10 text-accent",
                    isDone && !isActive && "text-card-foreground",
                    !isActive && !isDone && "text-muted",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="text-[11px] font-medium leading-tight sm:text-xs">
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <form
            id={formId}
            onSubmit={handleFormSubmit}
            className="flex h-full flex-col"
          >
            {error && (
              <p
                role="alert"
                className="mb-4 shrink-0 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {error}
              </p>
            )}

            {step === 1 ? (
              <fieldset className="space-y-4">
                <legend className="sr-only">Factura y método</legend>

                <div className="block">
                  <FieldLabel required>Factura comercial</FieldLabel>
                  {invoiceOptions.length > 0 ? (
                    <SearchableSelect
                      value={form.facturaComercialId}
                      onChange={(facturaComercialId) => {
                        setForm((f) => ({ ...f, facturaComercialId }));
                        setFieldErrors((prev) => ({
                          ...prev,
                          facturaComercialId: undefined,
                        }));
                      }}
                      options={invoiceOptions}
                      disabled={disabled || lockInvoice}
                      loading={invoicesLoading}
                      required
                      preloadOptions
                      emptyLabel="Seleccionar factura comercial"
                      searchPlaceholder="Buscar por N° factura o cliente…"
                      modalTitle="Factura comercial"
                    />
                  ) : (
                    <input
                      type="number"
                      min={1}
                      step={1}
                      required
                      value={form.facturaComercialId}
                      disabled={disabled || lockInvoice}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          facturaComercialId: e.target.value,
                        }));
                        setFieldErrors((prev) => ({
                          ...prev,
                          facturaComercialId: undefined,
                        }));
                      }}
                      className={cn(inputClass, "font-mono")}
                      placeholder="ID de factura comercial"
                    />
                  )}
                  {fieldErrors.facturaComercialId ? (
                    <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.facturaComercialId}
                    </span>
                  ) : null}
                </div>

                <label className="block">
                  <FieldLabel required>Método / Banco</FieldLabel>
                  <NativeSelect
                    required
                    value={form.metodoBanco}
                    disabled={disabled}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        metodoBanco: e.target
                          .value as CommercialPaymentFormValues["metodoBanco"],
                      }))
                    }
                  >
                    {COMMERCIAL_PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {COMMERCIAL_PAYMENT_METHOD_LABELS[method]}
                      </option>
                    ))}
                  </NativeSelect>
                  {fieldErrors.metodoBanco ? (
                    <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.metodoBanco}
                    </span>
                  ) : null}
                </label>
              </fieldset>
            ) : (
              <fieldset className="space-y-4">
                <legend className="sr-only">Detalles del pago</legend>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel>Monto</FieldLabel>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={form.monto}
                      disabled={disabled}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, monto: e.target.value }));
                        setFieldErrors((prev) => ({
                          ...prev,
                          monto: undefined,
                        }));
                      }}
                      className={cn(inputClass, "font-mono")}
                      placeholder="0.00"
                    />
                    {fieldErrors.monto ? (
                      <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                        {fieldErrors.monto}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <FieldLabel>Referencia</FieldLabel>
                    <input
                      type="text"
                      maxLength={100}
                      value={form.referencia}
                      disabled={disabled}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, referencia: e.target.value }));
                        setFieldErrors((prev) => ({
                          ...prev,
                          referencia: undefined,
                        }));
                      }}
                      className={cn(inputClass, "font-mono")}
                      placeholder="N° de operación o comprobante"
                    />
                    {fieldErrors.referencia ? (
                      <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                        {fieldErrors.referencia}
                      </span>
                    ) : null}
                  </label>
                </div>

                <label className="block">
                  <FieldLabel>Cuenta destino</FieldLabel>
                  <input
                    type="text"
                    maxLength={100}
                    value={form.cuentaDestino}
                    disabled={disabled}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        cuentaDestino: e.target.value,
                      }));
                      setFieldErrors((prev) => ({
                        ...prev,
                        cuentaDestino: undefined,
                      }));
                    }}
                    className={inputClass}
                    placeholder="Cuenta receptora, correo Zelle, wallet…"
                  />
                  {fieldErrors.cuentaDestino ? (
                    <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.cuentaDestino}
                    </span>
                  ) : null}
                </label>
              </fieldset>
            )}
          </form>
        </div>

        <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
          <FormDialogFooterBar>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between [&_button]:w-full sm:[&_button]:w-auto">
              <button
                type="button"
                onClick={goBack}
                disabled={saving || step === 1}
                className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
              >
                Atrás
              </button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted hover:bg-foreground/5 disabled:opacity-50"
                >
                  Cancelar
                </button>
                {step < 2 ? (
                  <button
                    type="submit"
                    form={formId}
                    disabled={disabled}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="submit"
                    form={formId}
                    disabled={disabled}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground",
                      disabled && "cursor-not-allowed opacity-70",
                    )}
                  >
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    {mode === "create"
                      ? "Crear pago comercial"
                      : "Guardar pago comercial"}
                  </button>
                )}
              </div>
            </div>
          </FormDialogFooterBar>
        </div>
      </div>
    </div>
  );
}

export function CommercialPaymentFormDialog({
  open,
  mode,
  payment,
  defaultInvoiceId,
  ...rest
}: CommercialPaymentFormDialogProps) {
  if (!open) return null;
  const dialogKey = `${mode}-${payment?.id ?? "new"}-${defaultInvoiceId ?? "none"}`;
  return (
    <CommercialPaymentFormDialogContent
      key={dialogKey}
      mode={mode}
      payment={payment}
      defaultInvoiceId={defaultInvoiceId}
      {...rest}
    />
  );
}
