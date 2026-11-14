"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { X } from "lucide-react";
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
import { getCommercialInvoicesErrorMessage } from "@/lib/commercial-invoices-api";
import { fetchCompanies } from "@/lib/companies-api";
import { zodFieldErrors } from "@/lib/form-zod";
import { commercialInvoiceFormSchema } from "@/lib/schemas/commercial-invoice-form-schema";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUSES,
  COMMERCIAL_INVOICE_MODALITIES,
  type CommercialInvoiceFormValues,
  type CommercialInvoiceResponse,
} from "@/types/commercial-invoice";
import type { CompanyResponse } from "@/types/company";

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

  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchCompanies()
      .then((companyList) => {
        if (!active) return;
        setCompanies(companyList);
        setCatalogError(null);
      })
      .catch((err) => {
        if (!active) return;
        setCatalogError(getCommercialInvoicesErrorMessage(err));
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const companyOptions: SearchableSelectOption[] = useMemo(
    () =>
      companies
        .map((c) => {
          const label = c.businessName?.trim() || c.rif;
          return {
            value: String(c.id),
            label,
            description: c.rif ? `RIF: ${c.rif}` : undefined,
            searchText: [String(c.id), c.businessName, c.rif]
              .filter(Boolean)
              .join(" "),
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [companies],
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

  const disabled = saving || catalogLoading;
  const inputClass = formFieldInputClass;
  const displayError = error || catalogError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
                className="text-lg font-semibold text-card-foreground"
              >
                {mode === "create"
                  ? "Nueva factura comercial"
                  : "Editar factura comercial"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {mode === "create"
                  ? "Registra número de factura, empresa, modalidad y estado de cobro."
                  : "Actualiza número de factura, empresa, modalidad y estado de cobro."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="Cerrar"
              className="rounded-lg p-1.5 text-muted hover:bg-foreground/5 disabled:opacity-50"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <form
          id={formId}
          onSubmit={handleFormSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
            {displayError && (
              <p
                role="alert"
                className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
              >
                {displayError}
              </p>
            )}

            <fieldset className="space-y-4 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-card-foreground">
                Datos de la factura
              </legend>

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

              <div className="block">
                <FieldLabel required>Empresa</FieldLabel>
                <SearchableSelect
                  required
                  value={form.empresaId}
                  onChange={(empresaId) => {
                    setForm((f) => ({
                      ...f,
                      empresaId,
                    }));
                    setFieldErrors((prev) => ({
                      ...prev,
                      empresaId: undefined,
                    }));
                  }}
                  options={companyOptions}
                  disabled={disabled}
                  loading={catalogLoading}
                  emptyLabel="Seleccionar empresa…"
                  searchPlaceholder="Buscar empresa o RIF…"
                  modalTitle="Seleccionar empresa"
                  preloadOptions
                />
                {fieldErrors.empresaId ? (
                  <span className="mt-1 block text-xs text-rose-600 dark:text-rose-400">
                    {fieldErrors.empresaId}
                  </span>
                ) : null}
              </div>

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
            </fieldset>
          </div>

          <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
            <FormDialogFooter
              mode={mode}
              saving={saving}
              submitDisabled={catalogLoading}
              onClose={onClose}
              createLabel="Crear factura"
              saveLabel="Guardar cambios"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
