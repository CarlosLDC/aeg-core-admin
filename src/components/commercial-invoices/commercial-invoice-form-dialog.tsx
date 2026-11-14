"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { FileText, Loader2, Plus, ReceiptText, X } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooterBar } from "@/components/ui/form-dialog-footer";
import { NativeSelect } from "@/components/ui/native-select";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS,
  COMMERCIAL_INVOICE_MODALITY_LABELS,
  commercialInvoiceToFormValues,
  emptyCommercialInvoiceForm,
} from "@/lib/commercial-invoice-form";
import {
  createCommercialClient,
  fetchCommercialClients,
  getCommercialInvoicesErrorMessage,
} from "@/lib/commercial-invoices-api";
import { zodFieldErrors } from "@/lib/form-zod";
import { commercialInvoiceFormSchema } from "@/lib/schemas/commercial-invoice-form-schema";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUSES,
  COMMERCIAL_INVOICE_MODALITIES,
  type CommercialClientResponse,
  type CommercialInvoiceFormValues,
  type CommercialInvoiceResponse,
} from "@/types/commercial-invoice";

type CommercialInvoiceFormDialogProps = {
  mode: "create" | "edit";
  invoice?: CommercialInvoiceResponse;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: CommercialInvoiceFormValues) => void;
};

type WizardStep = 1 | 2;

const FORM_STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "Identificación y cliente" },
  { step: 2, label: "Condiciones y notas" },
];

const STEP_ICONS = {
  1: ReceiptText,
  2: FileText,
} as const;

function stepSubtitle(step: WizardStep): string {
  switch (step) {
    case 1:
      return "Número de factura, sufijo de control y cliente comercial.";
    case 2:
      return "Modalidad comercial, estado de cobro y observaciones.";
  }
}

function CommercialInvoiceFormDialogContent({
  mode,
  invoice,
  saving,
  error,
  onClose,
  onSubmit,
}: Omit<CommercialInvoiceFormDialogProps, "open">) {
  const formId = useId();
  const titleId = useId();
  const [form, setForm] = useState<CommercialInvoiceFormValues>(() =>
    mode === "edit" && invoice
      ? commercialInvoiceToFormValues(invoice)
      : emptyCommercialInvoiceForm(),
  );
  const [step, setStep] = useState<WizardStep>(1);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CommercialInvoiceFormValues, string>>
  >({});

  const [clients, setClients] = useState<CommercialClientResponse[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [addingClient, setAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [savingClient, setSavingClient] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCommercialClients()
      .then((clientList) => {
        if (!active) return;
        setClients(clientList);
        setCatalogError(null);
      })
      .catch((err) => {
        if (!active) return;
        setCatalogError(getCommercialInvoicesErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleCreateClient() {
    const trimmed = newClientName.trim();
    if (!trimmed) return;
    setSavingClient(true);
    setCatalogError(null);
    try {
      const created = await createCommercialClient({ nombre: trimmed });
      setClients((prev) =>
        [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
      setForm((f) => ({ ...f, clienteComercialId: String(created.id) }));
      setNewClientName("");
      setAddingClient(false);
    } catch (err) {
      setCatalogError(getCommercialInvoicesErrorMessage(err));
    } finally {
      setSavingClient(false);
    }
  }

  function goToStep(target: WizardStep) {
    setFieldErrors({});
    setStep(target);
  }

  function goNext() {
    const parsed = commercialInvoiceFormSchema.safeParse(form);
    const errors = zodFieldErrors(parsed);
    if (
      errors &&
      (errors.numeroFactura ||
        errors.sufijoControl ||
        errors.clienteComercialId)
    ) {
      setFieldErrors({
        numeroFactura: errors.numeroFactura,
        sufijoControl: errors.sufijoControl,
        clienteComercialId: errors.clienteComercialId,
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
    const parsed = commercialInvoiceFormSchema.safeParse(form);
    const errors = zodFieldErrors(parsed);
    if (errors) {
      setFieldErrors(errors);
      if (
        errors.numeroFactura ||
        errors.sufijoControl ||
        errors.clienteComercialId
      ) {
        setStep(1);
      }
      return;
    }
    if (!parsed.success) return;
    setFieldErrors({});
    onSubmit(form);
  }

  const inputClass = formFieldInputClass;

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
                  ? "Nueva factura comercial"
                  : "Editar factura comercial"}
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
                <legend className="sr-only">Identificación y cliente</legend>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel>Número de factura</FieldLabel>
                    <input
                      type="text"
                      maxLength={30}
                      value={form.numeroFactura}
                      disabled={saving}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          numeroFactura: e.target.value,
                        }));
                        setFieldErrors((prev) => ({
                          ...prev,
                          numeroFactura: undefined,
                        }));
                      }}
                      className={cn(inputClass, "font-mono")}
                      placeholder="FAC-000123"
                    />
                    {fieldErrors.numeroFactura ? (
                      <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                        {fieldErrors.numeroFactura}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <FieldLabel>Sufijo de control</FieldLabel>
                    <input
                      type="text"
                      maxLength={10}
                      value={form.sufijoControl}
                      disabled={saving}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          sufijoControl: e.target.value,
                        }));
                        setFieldErrors((prev) => ({
                          ...prev,
                          sufijoControl: undefined,
                        }));
                      }}
                      className={cn(inputClass, "font-mono")}
                      placeholder="A1"
                    />
                    {fieldErrors.sufijoControl ? (
                      <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                        {fieldErrors.sufijoControl}
                      </span>
                    ) : null}
                  </label>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <FieldLabel>Cliente comercial</FieldLabel>
                    <button
                      type="button"
                      disabled={saving || savingClient}
                      onClick={() => setAddingClient((v) => !v)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-50"
                    >
                      <Plus className="size-3.5" aria-hidden />
                      {addingClient ? "Cancelar" : "Nuevo cliente"}
                    </button>
                  </div>
                  {addingClient ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={120}
                        value={newClientName}
                        disabled={savingClient}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className={inputClass}
                        placeholder="Nombre del cliente comercial"
                      />
                      <button
                        type="button"
                        disabled={savingClient || !newClientName.trim()}
                        onClick={() => void handleCreateClient()}
                        className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {savingClient ? "Guardando..." : "Crear"}
                      </button>
                    </div>
                  ) : (
                    <NativeSelect
                      value={form.clienteComercialId}
                      disabled={saving}
                      onChange={(e) => {
                        setForm((f) => ({
                          ...f,
                          clienteComercialId: e.target.value,
                        }));
                        setFieldErrors((prev) => ({
                          ...prev,
                          clienteComercialId: undefined,
                        }));
                      }}
                    >
                      <option value="">Sin cliente asignado</option>
                      {clients.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.nombre}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                  {fieldErrors.clienteComercialId ? (
                    <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.clienteComercialId}
                    </span>
                  ) : null}
                </div>
                {catalogError ? (
                  <p
                    role="alert"
                    className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
                  >
                    {catalogError}
                  </p>
                ) : null}
              </fieldset>
            ) : (
              <fieldset className="space-y-4">
                <legend className="sr-only">Condiciones y notas</legend>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel required>Modalidad</FieldLabel>
                    <NativeSelect
                      required
                      value={form.modalidad}
                      disabled={saving}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          modalidad: e.target
                            .value as CommercialInvoiceFormValues["modalidad"],
                        }))
                      }
                    >
                      {COMMERCIAL_INVOICE_MODALITIES.map((modality) => (
                        <option key={modality} value={modality}>
                          {COMMERCIAL_INVOICE_MODALITY_LABELS[modality]}
                        </option>
                      ))}
                    </NativeSelect>
                    {fieldErrors.modalidad ? (
                      <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                        {fieldErrors.modalidad}
                      </span>
                    ) : null}
                  </label>

                  <label className="block">
                    <FieldLabel required>Estado de cobro</FieldLabel>
                    <NativeSelect
                      required
                      value={form.estadoCobro}
                      disabled={saving}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          estadoCobro: e.target
                            .value as CommercialInvoiceFormValues["estadoCobro"],
                        }))
                      }
                    >
                      {COMMERCIAL_INVOICE_COLLECTION_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </NativeSelect>
                    {fieldErrors.estadoCobro ? (
                      <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                        {fieldErrors.estadoCobro}
                      </span>
                    ) : null}
                  </label>
                </div>

                <label className="block">
                  <FieldLabel>Notas comerciales</FieldLabel>
                  <textarea
                    rows={4}
                    maxLength={5000}
                    value={form.notasComerciales}
                    disabled={saving}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        notasComerciales: e.target.value,
                      }));
                      setFieldErrors((prev) => ({
                        ...prev,
                        notasComerciales: undefined,
                      }));
                    }}
                    className={cn(inputClass, "h-auto py-2.5")}
                    placeholder="Acuerdos, condiciones de pago, observaciones…"
                  />
                  {fieldErrors.notasComerciales ? (
                    <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                      {fieldErrors.notasComerciales}
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
                    disabled={saving}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="submit"
                    form={formId}
                    disabled={saving}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground",
                      saving && "cursor-not-allowed opacity-70",
                    )}
                  >
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    {mode === "create"
                      ? "Crear factura comercial"
                      : "Guardar factura comercial"}
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

export function CommercialInvoiceFormDialog({
  open,
  mode,
  invoice,
  ...rest
}: CommercialInvoiceFormDialogProps) {
  if (!open) return null;
  const dialogKey = `${mode}-${invoice?.id ?? "new"}`;
  return (
    <CommercialInvoiceFormDialogContent
      key={dialogKey}
      mode={mode}
      invoice={invoice}
      {...rest}
    />
  );
}
