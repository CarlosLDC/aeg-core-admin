"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { Plus, ReceiptText, X } from "lucide-react";
import { CommercialClientCreateDialog } from "@/components/commercial-invoices/commercial-client-create-dialog";
import { FieldLabel } from "@/components/ui/field-label";
import { FormDialogFooter } from "@/components/ui/form-dialog-footer";
import { NativeSelect } from "@/components/ui/native-select";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS,
  COMMERCIAL_INVOICE_MODALITY_LABELS,
  commercialInvoiceToFormValues,
  emptyCommercialInvoiceForm,
} from "@/lib/commercial-invoice-form";
import {
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

export function CommercialInvoiceFormDialog(
  props: CommercialInvoiceFormDialogProps,
) {
  if (!props.open) return null;
  return <CommercialInvoiceFormDialogContent {...props} />;
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
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CommercialInvoiceFormValues, string>>
  >({});

  const [clients, setClients] = useState<CommercialClientResponse[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [createClientOpen, setCreateClientOpen] = useState(false);

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

  const clientOptions: SearchableSelectOption[] = useMemo(
    () =>
      clients.map((c) => ({
        value: String(c.id),
        label: c.nombre,
        description: c.rif ? `RIF: ${c.rif}` : (c.notas ?? undefined),
        searchText: [String(c.id), c.nombre, c.rif, c.notas]
          .filter(Boolean)
          .join(" "),
      })),
    [clients],
  );

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = commercialInvoiceFormSchema.safeParse(form);
    const errors = zodFieldErrors(parsed);
    if (errors) {
      setFieldErrors(errors);
      return;
    }
    if (!parsed.success) return;
    setFieldErrors({});
    onSubmit(form);
  }

  const inputClass = formFieldInputClass;
  const displayError = error || catalogError;

  return (
    <>
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
        <div className="relative flex max-h-[min(90vh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <ReceiptText className="size-5" aria-hidden />
              </div>
              <div>
                <h2
                  id={titleId}
                  className="text-base font-semibold leading-snug text-card-foreground sm:text-lg"
                >
                  {mode === "create"
                    ? "Nueva factura comercial"
                    : "Editar factura comercial"}
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  4 campos requeridos para el registro comercial.
                </p>
              </div>
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

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <form
              id={formId}
              onSubmit={handleFormSubmit}
              className="space-y-4"
            >
              {displayError && (
                <p
                  role="alert"
                  className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-700 dark:text-rose-300"
                >
                  {displayError}
                </p>
              )}

              {/* 1. Número de factura */}
              <label className="block">
                <FieldLabel required>Número de factura</FieldLabel>
                <input
                  type="text"
                  required
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

              {/* 2. Cliente comercial */}
              <div className="block">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <FieldLabel required>Cliente comercial</FieldLabel>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setCreateClientOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-50"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Nuevo cliente
                  </button>
                </div>
                <SearchableSelect
                  required
                  value={form.clienteComercialId}
                  onChange={(clienteComercialId) => {
                    setForm((f) => ({
                      ...f,
                      clienteComercialId,
                    }));
                    setFieldErrors((prev) => ({
                      ...prev,
                      clienteComercialId: undefined,
                    }));
                  }}
                  options={clientOptions}
                  disabled={saving}
                  emptyLabel="Seleccionar cliente comercial…"
                  searchPlaceholder="Buscar cliente comercial…"
                  modalTitle="Seleccionar cliente comercial"
                  preloadOptions
                />
                {fieldErrors.clienteComercialId ? (
                  <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                    {fieldErrors.clienteComercialId}
                  </span>
                ) : null}
              </div>

              {/* 3. Modalidad y 4. Estado de cobro */}
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
            </form>
          </div>

          <div className="shrink-0 border-t border-border px-5 py-3">
            <FormDialogFooter
              mode={mode}
              saving={saving}
              onClose={onClose}
              createLabel="Crear factura"
              saveLabel="Guardar cambios"
              formId={formId}
            />
          </div>
        </div>
      </div>

      <CommercialClientCreateDialog
        open={createClientOpen}
        onClose={() => setCreateClientOpen(false)}
        onCreated={(newClient) => {
          setClients((prev) => [newClient, ...prev]);
          setForm((f) => ({
            ...f,
            clienteComercialId: String(newClient.id),
          }));
          setFieldErrors((prev) => ({
            ...prev,
            clienteComercialId: undefined,
          }));
          setCreateClientOpen(false);
        }}
      />
    </>
  );
}
