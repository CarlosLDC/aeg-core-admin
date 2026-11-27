"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { CommercialInvoiceCollectionStatusBadge } from "@/components/commercial-invoices/commercial-invoice-badges";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { FieldLabel } from "@/components/ui/field-label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useToast } from "@/context/toast-provider";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS,
  COMMERCIAL_INVOICE_MODALITY_LABELS,
  formatCommercialInvoiceTitle,
} from "@/lib/commercial-invoice-form";
import {
  fetchCommercialInvoices,
  getCommercialInvoicesErrorMessage,
} from "@/lib/commercial-invoices-api";
import { fetchCompanies } from "@/lib/companies-api";
import {
  type AuthorizeEnajenacionInvoiceMode,
  buildAuthorizeEnajenacionPayload,
  emptyAuthorizeNewInvoiceForm,
  sortCommercialInvoicesForPrinter,
} from "@/lib/printer-authorize-enajenacion";
import {
  authorizePrinterEnajenacion,
  getPrintersErrorMessage,
} from "@/lib/printers-api";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUSES,
  COMMERCIAL_INVOICE_MODALITIES,
  type CommercialInvoiceFormValues,
  type CommercialInvoiceResponse,
} from "@/types/commercial-invoice";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";

type PrinterAuthorizeEnajenacionDialogProps = {
  printer: PrinterResponse;
  defaultEmpresaId?: number | null;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
};

export function PrinterAuthorizeEnajenacionDialog({
  printer,
  defaultEmpresaId,
  onClose,
  onUpdated,
}: PrinterAuthorizeEnajenacionDialogProps) {
  const titleId = useId();
  const toast = useToast();

  const [creditInstallments, setCreditInstallments] = useState(
    printer.creditInstallments != null ? String(printer.creditInstallments) : "1",
  );
  const [finalSalePrice, setFinalSalePrice] = useState(
    printer.finalSalePrice != null ? String(printer.finalSalePrice) : "",
  );
  const [invoiceMode, setInvoiceMode] =
    useState<AuthorizeEnajenacionInvoiceMode>("existing");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(
    printer.facturaComercialId != null ? String(printer.facturaComercialId) : "",
  );
  const [newInvoice, setNewInvoice] = useState<CommercialInvoiceFormValues>(() =>
    emptyAuthorizeNewInvoiceForm(defaultEmpresaId),
  );

  const [invoices, setInvoices] = useState<CommercialInvoiceResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchCommercialInvoices(), fetchCompanies()])
      .then(([invoiceList, companyList]) => {
        if (!active) return;
        setInvoices(invoiceList);
        setCompanies(companyList);
        setCatalogError(null);

        if (printer.facturaComercialId != null) {
          const linked = invoiceList.find(
            (inv) => inv.id === printer.facturaComercialId,
          );
          if (linked?.empresaId != null) {
            setNewInvoice((prev) =>
              prev.empresaId ? prev : { ...prev, empresaId: String(linked.empresaId) },
            );
          }
        }
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
  }, [printer.facturaComercialId]);

  const sortedInvoices = useMemo(
    () =>
      sortCommercialInvoicesForPrinter(
        invoices,
        printer,
        defaultEmpresaId ?? null,
      ),
    [invoices, printer, defaultEmpresaId],
  );

  const invoiceOptions: SearchableSelectOption[] = useMemo(
    () =>
      sortedInvoices.map((inv) => {
        const companyName = inv.empresaNombre ?? inv.clienteComercialNombre;
        const countLabel = `${inv.printerCount} ${inv.printerCount === 1 ? "impresora" : "impresoras"}`;
        const description = [
          companyName,
          COMMERCIAL_INVOICE_MODALITY_LABELS[inv.modalidad] ?? inv.modalidad,
          countLabel,
        ]
          .filter(Boolean)
          .join(" · ");

        return {
          value: String(inv.id),
          label: formatCommercialInvoiceTitle(inv),
          description,
          badge: (
            <CommercialInvoiceCollectionStatusBadge status={inv.estadoCobro} />
          ),
          searchText: [
            String(inv.id),
            inv.numeroFactura,
            inv.empresaNombre,
            inv.empresaRif,
            inv.clienteComercialNombre,
            COMMERCIAL_INVOICE_MODALITY_LABELS[inv.modalidad],
            COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS[inv.estadoCobro],
          ]
            .filter(Boolean)
            .join(" "),
        };
      }),
    [sortedInvoices],
  );

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

  const selectedInvoice = useMemo(() => {
    const id = Number(selectedInvoiceId);
    if (!Number.isInteger(id) || id <= 0) return null;
    return invoices.find((inv) => inv.id === id) ?? null;
  }, [invoices, selectedInvoiceId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const payloadOrError = buildAuthorizeEnajenacionPayload({
      creditInstallments,
      finalSalePrice,
      invoiceMode,
      selectedInvoiceId,
      newInvoice,
    });

    if (typeof payloadOrError === "string") {
      setError(payloadOrError);
      return;
    }

    setSaving(true);
    try {
      const updated = await authorizePrinterEnajenacion(
        printer.id,
        payloadOrError,
      );
      const invoiceLabel =
        updated.facturaComercialNumero?.trim() ||
        (invoiceMode === "existing"
          ? selectedInvoice?.numeroFactura
          : newInvoice.numeroFactura.trim());
      const installments = payloadOrError.creditInstallments;
      toast.success(
        `Permiso para enajenar ${printer.fiscalSerial} otorgado${invoiceLabel ? ` · Factura ${invoiceLabel}` : ""} (${installments} cuota${installments === 1 ? "" : "s"}).`,
      );
      await onUpdated();
      onClose();
    } catch (err) {
      const message = getPrintersErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const displayError = error || catalogError;
  const submitDisabled =
    catalogLoading ||
    !creditInstallments.trim() ||
    (invoiceMode === "existing"
      ? !selectedInvoiceId.trim()
      : !newInvoice.empresaId.trim());

  return (
    <PrinterActionDialogShell
      title="Dar permiso para enajenar"
      titleId={titleId}
      printer={printer}
      size="lg"
      saving={saving}
      error={displayError}
      onClose={onClose}
      onSubmit={(e) => void handleSubmit(e)}
      submitLabel="Dar permiso"
      submitDisabled={submitDisabled}
      submitLoading={saving}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-0.5">
        <fieldset className="space-y-4 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold text-card-foreground">
            Orden
          </legend>

          <SegmentedToggle
            value={invoiceMode}
            onChange={(mode) => {
              setInvoiceMode(mode);
              setError(null);
            }}
            disabled={saving}
            ariaLabel="Origen de la orden"
            options={[
              { value: "existing", label: "Seleccionar existente" },
              { value: "new", label: "Crear nueva" },
            ]}
          />

          {invoiceMode === "existing" ? (
            <div className="space-y-2.5">
              <div className="block">
                <FieldLabel required>Orden</FieldLabel>
                <SearchableSelect
                  required
                  value={selectedInvoiceId}
                  onChange={(value) => {
                    setSelectedInvoiceId(value);
                    setError(null);
                  }}
                  options={invoiceOptions}
                  disabled={saving || catalogLoading}
                  loading={catalogLoading}
                  emptyLabel="Seleccionar orden…"
                  searchPlaceholder="Buscar por N° factura, empresa o RIF…"
                  modalTitle="Seleccionar orden"
                  preloadOptions
                  mono
                />
              </div>

              {!catalogLoading && invoices.length === 0 ? (
                <div className="rounded-lg border border-border bg-foreground/[0.02] px-3 py-2.5 text-xs text-muted">
                  <p>No hay órdenes registradas aún.</p>
                  <button
                    type="button"
                    onClick={() => setInvoiceMode("new")}
                    className="mt-1.5 font-medium text-accent hover:underline"
                  >
                    Crear nueva orden →
                  </button>
                </div>
              ) : null}

              {selectedInvoice ? (
                <div className="space-y-1 text-xs text-muted">
                  {selectedInvoice.id === printer.facturaComercialId ? (
                    <p>Factura actualmente asociada a esta impresora.</p>
                  ) : null}
                  {selectedInvoice.modalidad === "CONSIGNACION" &&
                  selectedInvoice.printerCount > 1 ? (
                    <p>
                      Esta factura es compartida con otras impresoras y no se
                      modificará; si deseas facturar esta unidad aparte, usa «Crear
                      nueva».
                    </p>
                  ) : null}
                  {selectedInvoice.estadoCobro === "PAGADO" ? (
                    <p>
                      Esta factura figura como Pagada; al completar la enajenación
                      la impresora pasará directamente a Enajenada.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="block">
                  <FieldLabel>Número de orden</FieldLabel>
                  <input
                    type="text"
                    maxLength={30}
                    value={newInvoice.numeroFactura}
                    disabled={saving}
                    onChange={(e) => {
                      setNewInvoice((prev) => ({
                        ...prev,
                        numeroFactura: e.target.value,
                      }));
                      setError(null);
                    }}
                    className={cn(formFieldInputClass, "font-mono")}
                    placeholder="FAC-000123"
                  />
                </label>

                <div className="block">
                  <FieldLabel required>Empresa</FieldLabel>
                  <SearchableSelect
                    required
                    value={newInvoice.empresaId}
                    onChange={(empresaId) => {
                      setNewInvoice((prev) => ({ ...prev, empresaId }));
                      setError(null);
                    }}
                    options={companyOptions}
                    disabled={saving || catalogLoading}
                    loading={catalogLoading}
                    emptyLabel="Seleccionar empresa…"
                    searchPlaceholder="Buscar empresa o RIF…"
                    modalTitle="Seleccionar empresa"
                    preloadOptions
                  />
                </div>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-3">
                <label className="block">
                  <FieldLabel required>Modalidad</FieldLabel>
                  <NativeSelect
                    required
                    value={newInvoice.modalidad}
                    disabled={saving}
                    onChange={(e) =>
                      setNewInvoice((prev) => ({
                        ...prev,
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
                </label>

                <label className="block">
                  <FieldLabel required>Estado de cobro</FieldLabel>
                  <NativeSelect
                    required
                    value={newInvoice.estadoCobro}
                    disabled={saving}
                    onChange={(e) =>
                      setNewInvoice((prev) => ({
                        ...prev,
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
                </label>

                <label className="block">
                  <FieldLabel>Monto total (opcional)</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={newInvoice.montoTotal}
                    disabled={saving}
                    onChange={(e) => {
                      setNewInvoice((prev) => ({
                        ...prev,
                        montoTotal: e.target.value,
                      }));
                      setError(null);
                    }}
                    className={cn(formFieldInputClass, "font-mono")}
                    placeholder="Ej. 900.00"
                  />
                </label>
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold text-card-foreground">
            Condiciones de crédito
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="grant-credit-installments" className="block">
              <FieldLabel required>Cuotas pactadas</FieldLabel>
              <input
                id="grant-credit-installments"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                value={creditInstallments}
                disabled={saving}
                onChange={(e) => setCreditInstallments(e.target.value)}
                placeholder="Ej. 4"
                className={formFieldInputClass}
              />
            </label>

            <label htmlFor="grant-final-sale-price" className="block">
              <FieldLabel>Monto total de venta (opcional)</FieldLabel>
              <input
                id="grant-final-sale-price"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={finalSalePrice}
                disabled={saving}
                onChange={(e) => setFinalSalePrice(e.target.value)}
                placeholder="Ej. 450.00"
                className={formFieldInputClass}
              />
            </label>
          </div>
        </fieldset>
      </div>
    </PrinterActionDialogShell>
  );
}
