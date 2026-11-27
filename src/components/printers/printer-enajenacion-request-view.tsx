"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";
import { CommercialInvoiceCollectionStatusBadge } from "@/components/commercial-invoices/commercial-invoice-badges";
import { DetailCard, DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import { FieldLabel } from "@/components/ui/field-label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import { fetchBranches } from "@/lib/branches-api";
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
import { formatDate } from "@/lib/datetime-form";
import { fetchDistributors } from "@/lib/distributors-api";
import { formatResourceId } from "@/lib/format-resource-id";
import {
  type AuthorizeEnajenacionInvoiceMode,
  buildAuthorizeEnajenacionPayload,
  emptyAuthorizeNewInvoiceForm,
  resolvePrinterDistributorCompanyId,
  sortCommercialInvoicesForPrinter,
} from "@/lib/printer-authorize-enajenacion";
import {
  approvePrinterEnajenacionRequest,
  fetchPrinterEnajenacionRequestById,
  getPrinterEnajenacionRequestsErrorMessage,
  rejectPrinterEnajenacionRequest,
} from "@/lib/printer-enajenacion-requests-api";
import { fetchPrinterById } from "@/lib/printers-api";
import { printerPath } from "@/lib/resource-routes";
import {
  formFieldInputClass,
  formFieldTextareaClass,
} from "@/lib/toggle-button-styles";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { ModificationRequestStatus } from "@/types/client-modification-request";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUSES,
  COMMERCIAL_INVOICE_MODALITIES,
  type CommercialInvoiceFormValues,
  type CommercialInvoiceResponse,
} from "@/types/commercial-invoice";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";
import type { PrinterEnajenacionRequestDetailResponse } from "@/types/printer-enajenacion-request";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ModificationRequestStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

const STATUS_STYLES: Record<ModificationRequestStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  CANCELLED: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
};

type PrinterEnajenacionRequestViewProps = {
  backHref?: string;
};

export function PrinterEnajenacionRequestView({
  backHref = "/reviews",
}: PrinterEnajenacionRequestViewProps) {
  const id = useResourceId();
  const toast = useToast();
  const confirm = useConfirm();

  const [row, setRow] = useState<PrinterEnajenacionRequestDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creditInstallments, setCreditInstallments] = useState("1");
  const [finalSalePrice, setFinalSalePrice] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [invoiceMode, setInvoiceMode] =
    useState<AuthorizeEnajenacionInvoiceMode>("existing");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [newInvoice, setNewInvoice] = useState<CommercialInvoiceFormValues>(() =>
    emptyAuthorizeNewInvoiceForm(),
  );
  const [printer, setPrinter] = useState<PrinterResponse | null>(null);
  const [invoices, setInvoices] = useState<CommercialInvoiceResponse[]>([]);
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [distributors, setDistributors] = useState<DistributorResponse[]>([]);
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null) {
      return;
    }
    let active = true;
    void (async () => {
      try {
        const data = await fetchPrinterEnajenacionRequestById(id);
        if (!active) return;
        setRow(data);
        const initialInstallments =
          data.suggestedInstallments ?? data.currentCreditInstallments ?? 1;
        setCreditInstallments(String(initialInstallments));
        setFinalSalePrice(
          data.finalSalePrice != null ? String(data.finalSalePrice) : "",
        );
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(getPrinterEnajenacionRequestsErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const canReview = row?.status === "PENDING";
  const pendingPrinterId = canReview && row ? row.printerId : null;

  useEffect(() => {
    if (pendingPrinterId == null) {
      return;
    }
    let active = true;
    void (async () => {
      setCatalogLoading(true);
      try {
        const [
          invoiceList,
          companyList,
          distributorList,
          branchList,
          printerData,
        ] = await Promise.all([
          fetchCommercialInvoices(),
          fetchCompanies(),
          fetchDistributors().catch(() => []),
          fetchBranches().catch(() => []),
          fetchPrinterById(pendingPrinterId).catch(() => null),
        ]);
        if (!active) return;
        setInvoices(invoiceList);
        setCompanies(companyList);
        setDistributors(distributorList);
        setBranches(branchList);
        setPrinter(printerData);
        setCatalogError(null);
        if (printerData?.facturaComercialId != null) {
          setSelectedInvoiceId((prev) =>
            prev || String(printerData.facturaComercialId),
          );
        }
        const preferredEmpresaId = resolvePrinterDistributorCompanyId(
          printerData ?? { distributorId: row?.distributorId ?? null },
          distributorList,
          branchList,
        );
        if (preferredEmpresaId != null) {
          setNewInvoice((prev) =>
            prev.empresaId ? prev : { ...prev, empresaId: String(preferredEmpresaId) },
          );
        }
      } catch (err) {
        if (!active) return;
        setCatalogError(getCommercialInvoicesErrorMessage(err));
      } finally {
        if (active) setCatalogLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [pendingPrinterId, row?.distributorId]);

  const preferredEmpresaId = useMemo(
    () =>
      resolvePrinterDistributorCompanyId(
        printer ?? { distributorId: row?.distributorId ?? null },
        distributors,
        branches,
      ),
    [printer, row?.distributorId, distributors, branches],
  );

  const sortedInvoices = useMemo(
    () =>
      sortCommercialInvoicesForPrinter(
        invoices,
        printer ?? { facturaComercialId: null },
        preferredEmpresaId,
      ),
    [invoices, printer, preferredEmpresaId],
  );

  const invoiceOptions: SearchableSelectOption[] = useMemo(
    () =>
      sortedInvoices.map((inv) => {
        const companyName = inv.empresaNombre ?? inv.clienteComercialNombre;
        const countLabel = `${inv.printerCount} ${inv.printerCount === 1 ? "impresora" : "impresoras"}`;
        return {
          value: String(inv.id),
          label: formatCommercialInvoiceTitle(inv),
          description: [
            companyName,
            COMMERCIAL_INVOICE_MODALITY_LABELS[inv.modalidad] ?? inv.modalidad,
            countLabel,
          ]
            .filter(Boolean)
            .join(" · "),
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

  async function handleApprove() {
    if (!row) return;
    setFormError(null);

    const payloadOrError = buildAuthorizeEnajenacionPayload({
      creditInstallments,
      finalSalePrice,
      invoiceMode,
      selectedInvoiceId,
      newInvoice,
    });
    if (typeof payloadOrError === "string") {
      setFormError(payloadOrError);
      return;
    }

    const ok = await confirm({
      title: "Autorizar enajenación a crédito",
      message: `¿Autorizar la enajenación de la impresora ${row.fiscalSerial} en ${payloadOrError.creditInstallments} cuota${payloadOrError.creditInstallments === 1 ? "" : "s"}? El distribuidor podrá ver el botón Enajenar y al completar el proceso la impresora pasará al estatus A crédito.`,
      destructive: false,
    });
    if (!ok) return;

    setSaving(true);
    try {
      const updated = await approvePrinterEnajenacionRequest(row.id, {
        ...payloadOrError,
        reviewNote: reviewNote.trim() || null,
      });
      setRow(updated);
      toast.success(
        `Permiso aprobado para ${row.fiscalSerial} (${payloadOrError.creditInstallments} cuotas).`,
      );
    } catch (err) {
      const message = getPrinterEnajenacionRequestsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!row) return;
    const ok = await confirm({
      title: "Rechazar solicitud",
      message: `¿Rechazar la solicitud de permiso para enajenar la impresora ${row.fiscalSerial}?`,
      destructive: true,
    });
    if (!ok) return;

    setSaving(true);
    setFormError(null);
    try {
      const updated = await rejectPrinterEnajenacionRequest(row.id, {
        reason: reviewNote.trim() || null,
      });
      setRow(updated);
      toast.success("Solicitud rechazada.");
    } catch (err) {
      const message = getPrinterEnajenacionRequestsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const effectiveError =
    id == null ? "Identificador de solicitud no válido." : error;
  const effectiveLoading = id != null && loading;
  const displayFormError = formError || catalogError;

  return (
    <ResourceViewShell
      backHref={backHref}
      backLabel="Volver a revisiones"
      title={row ? `Permiso de enajenación · ${row.fiscalSerial}` : "Solicitud de enajenación"}
      subtitle={row ? `${formatResourceId(row.id)} · ${row.distributorName}` : undefined}
      loading={effectiveLoading}
      error={effectiveError}
      actions={
        canReview ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleReject()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-300"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              Rechazar
            </button>
            <button
              type="button"
              onClick={() => void handleApprove()}
              disabled={saving || catalogLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Aprobar permiso
            </button>
          </div>
        ) : null
      }
    >
      {row ? (
        <div className="space-y-6">
          <DetailCard>
            <DetailField label="Serial fiscal" value={row.fiscalSerial} mono />
            <DetailField label="Modelo" value={row.modelCode} />
            <DetailField label="Distribuidor" value={row.distributorName} />
            <DetailField
              label="Estatus actual de impresora"
              value={
                row.printerStatus ? (
                  <PrinterStatusBadge status={row.printerStatus} />
                ) : (
                  "—"
                )
              }
            />
            <DetailField label="Solicitado por" value={row.requestedByName} />
            <DetailField label="Fecha de solicitud" value={formatDate(row.createdAt)} />
            <DetailField
              label="Estatus de solicitud"
              value={
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    STATUS_STYLES[row.status],
                  )}
                >
                  {STATUS_LABELS[row.status]}
                </span>
              }
            />
            <DetailField
              label="Cuotas sugeridas por distribuidor"
              value={
                row.suggestedInstallments != null
                  ? `${row.suggestedInstallments} cuota${row.suggestedInstallments === 1 ? "" : "s"}`
                  : "Sin especificar"
              }
            />
            <DetailField
              label="Notas del distribuidor"
              value={row.notes || "Sin notas adicionales"}
              fullWidth
            />
          </DetailCard>

          {canReview ? (
            <>
              <DetailSection title="Orden" layout="quad">
                <div className="sm:col-span-4 space-y-4">
                  <SegmentedToggle
                    value={invoiceMode}
                    onChange={(mode) => {
                      setInvoiceMode(mode);
                      setFormError(null);
                    }}
                    disabled={saving}
                    ariaLabel="Origen de la orden"
                    options={[
                      { value: "existing", label: "Seleccionar existente" },
                      { value: "new", label: "Crear nueva" },
                    ]}
                  />

                  {invoiceMode === "existing" ? (
                    <div>
                      <FieldLabel required>Orden</FieldLabel>
                      <SearchableSelect
                        required
                        value={selectedInvoiceId}
                        onChange={(value) => {
                          setSelectedInvoiceId(value);
                          setFormError(null);
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
                              setFormError(null);
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
                              setFormError(null);
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
                            {COMMERCIAL_INVOICE_COLLECTION_STATUSES.map(
                              (status) => (
                                <option key={status} value={status}>
                                  {
                                    COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS[
                                      status
                                    ]
                                  }
                                </option>
                              ),
                            )}
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
                              setFormError(null);
                            }}
                            className={cn(formFieldInputClass, "font-mono")}
                            placeholder="Ej. 900.00"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </DetailSection>

              <DetailSection
                title="Condiciones de aprobación (Crédito)"
                layout="quad"
              >
                <p className="sm:col-span-4 text-xs text-muted">
                  Define a cuántas cuotas se pagará la impresora al aprobar el permiso para enajenarla.
                </p>
                <div className="sm:col-span-2">
                  <FieldLabel required>
                    Cantidad de cuotas
                  </FieldLabel>
                  <input
                    id="approve-installments"
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={creditInstallments}
                    onChange={(e) => setCreditInstallments(e.target.value)}
                    className={formFieldInputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>
                    Precio de venta total (opcional)
                  </FieldLabel>
                  <input
                    id="approve-sale-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={finalSalePrice}
                    onChange={(e) => setFinalSalePrice(e.target.value)}
                    placeholder="Ej. 450.00"
                    className={formFieldInputClass}
                  />
                </div>
                <div className="sm:col-span-4">
                  <FieldLabel>
                    Nota de revisión (opcional)
                  </FieldLabel>
                  <textarea
                    id="review-note"
                    rows={2}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Comentarios de aprobación o motivo de rechazo…"
                    className={formFieldTextareaClass}
                  />
                </div>
                {displayFormError ? (
                  <p
                    role="alert"
                    className="sm:col-span-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
                  >
                    {displayFormError}
                  </p>
                ) : null}
              </DetailSection>
            </>
          ) : (
            <DetailSection title="Resolución" layout="quad">
              <DetailField
                label="Cuotas aprobadas"
                value={
                  row.approvedInstallments != null
                    ? `${row.approvedInstallments} cuota${row.approvedInstallments === 1 ? "" : "s"}`
                    : "—"
                }
              />
              <DetailField
                label="Nota de revisión"
                value={row.reviewNote || "—"}
              />
            </DetailSection>
          )}

          <div>
            <Link
              href={printerPath(row.printerId)}
              className="text-sm font-medium text-accent hover:underline"
            >
              Ver detalle de la impresora {row.fiscalSerial} →
            </Link>
          </div>
        </div>
      ) : null}
    </ResourceViewShell>
  );
}
