"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CommercialInvoiceCollectionStatusBadge,
  CommercialInvoiceModalityBadge,
} from "@/components/commercial-invoices/commercial-invoice-badges";
import { CommercialInvoiceFormDialog } from "@/components/commercial-invoices/commercial-invoice-form-dialog";
import { CommercialInvoicePrintersDialog } from "@/components/commercial-invoices/commercial-invoice-printers-dialog";
import { CommercialPaymentFormDialog } from "@/components/commercial-payments/commercial-payment-form-dialog";
import { CommercialPaymentMethodBadge } from "@/components/commercial-payments/commercial-payment-method-badge";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import {
  DetailField,
  DetailSection,
} from "@/components/resource-view/detail-fields";
import {
  DetailSectionsPager,
  type DetailPagerStep,
} from "@/components/resource-view/detail-sections-pager";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useAuth } from "@/context/auth-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canCreateCommercialPaymentRecord,
  canDeleteCommercialInvoiceRecord,
  canDeleteCommercialPaymentRecord,
  canModifyCommercialInvoiceRecord,
  canModifyCommercialPaymentRecord,
} from "@/lib/api-permissions";
import {
  formatCommercialInvoiceTitle,
  toCommercialInvoiceRequest,
} from "@/lib/commercial-invoice-form";
import {
  deleteCommercialInvoice,
  fetchCommercialInvoiceById,
  getCommercialInvoicesErrorMessage,
  markCommercialInvoiceAsPaid,
  syncCommercialInvoicePrinters,
  unlinkCommercialInvoicePrinter,
  updateCommercialInvoice,
} from "@/lib/commercial-invoices-api";
import { toCommercialPaymentRequest } from "@/lib/commercial-payment-form";
import {
  createCommercialPayment,
  deleteCommercialPayment,
  fetchCommercialPayments,
  getCommercialPaymentsErrorMessage,
  updateCommercialPayment,
} from "@/lib/commercial-payments-api";
import { formatDate, formatMoney } from "@/lib/datetime-form";
import { formatInventoryBoxLabel } from "@/lib/inventory-box-form";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { printerModelLabel } from "@/lib/printer-form";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import { fetchPrinters } from "@/lib/printers-api";
import {
  commercialInvoicePath,
  commercialInvoicesListPath,
  commercialPaymentPath,
  printerPath,
} from "@/lib/resource-routes";
import { hrefForCompany } from "@/lib/table-foreign-hrefs";
import type {
  CommercialInvoiceFormValues,
  CommercialInvoiceResponse,
} from "@/types/commercial-invoice";
import type {
  CommercialPaymentFormValues,
  CommercialPaymentResponse,
} from "@/types/commercial-payment";
import type { PrinterResponse } from "@/types/printer";
import type { PrinterModelResponse } from "@/types/printer-model";

export function CommercialInvoiceView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();

  const canModify = user ? canModifyCommercialInvoiceRecord(user.role) : false;
  const canDelete = user ? canDeleteCommercialInvoiceRecord(user.role) : false;
  const canCreatePayment = user
    ? canCreateCommercialPaymentRecord(user.role)
    : false;
  const canModifyPayment = user
    ? canModifyCommercialPaymentRecord(user.role)
    : false;
  const canDeletePayment = user
    ? canDeleteCommercialPaymentRecord(user.role)
    : false;

  const [invoice, setInvoice] = useState<CommercialInvoiceResponse | null>(
    null,
  );
  const [payments, setPayments] = useState<CommercialPaymentResponse[]>([]);
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [models, setModels] = useState<PrinterModelResponse[]>([]);
  const [printersLoading, setPrintersLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [printersDialogOpen, setPrintersDialogOpen] = useState(false);
  const [savingPrinters, setSavingPrinters] = useState(false);
  const [printersFormError, setPrintersFormError] = useState<string | null>(
    null,
  );
  const [unlinkingPrinterId, setUnlinkingPrinterId] = useState<number | null>(
    null,
  );

  const [paymentDialog, setPaymentDialog] = useState<"create" | "edit" | null>(
    null,
  );
  const [selectedPayment, setSelectedPayment] =
    useState<CommercialPaymentResponse | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentFormError, setPaymentFormError] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(
    null,
  );

  const reloadAll = useCallback(async () => {
    if (id == null) return;
    try {
      const [invoiceData, paymentsData, printersData, modelsData] =
        await Promise.all([
          fetchCommercialInvoiceById(id),
          fetchCommercialPayments(id),
          fetchPrinters().catch(() => null),
          fetchPrinterModels().catch(() => null),
        ]);
      setInvoice(invoiceData);
      setPayments(paymentsData);
      if (printersData != null) {
        setPrinters(printersData);
      }
      if (modelsData != null) {
        setModels(modelsData);
      }
      setPrintersLoading(false);
      setError(null);
    } catch (err) {
      setError(getCommercialInvoicesErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    if (id == null) {
      return;
    }
    let active = true;
    void (async () => {
      try {
        const [invoiceData, paymentsData, printersData, modelsData] =
          await Promise.all([
            fetchCommercialInvoiceById(id),
            fetchCommercialPayments(id),
            fetchPrinters().catch(() => null),
            fetchPrinterModels().catch(() => null),
          ]);
        if (!active) return;
        setInvoice(invoiceData);
        setPayments(paymentsData);
        if (printersData != null) {
          setPrinters(printersData);
        }
        if (modelsData != null) {
          setModels(modelsData);
        }
        setPrintersLoading(false);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(getCommercialInvoicesErrorMessage(err));
      } finally {
        if (active) {
          setLoading(false);
          setPrintersLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(values: CommercialInvoiceFormValues) {
    if (!invoice) return;
    if (!canModify) {
      setFormError(forbiddenMessage("update", "commercialInvoices"));
      return;
    }

    const bodyOrError = toCommercialInvoiceRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const updated = await updateCommercialInvoice(invoice.id, bodyOrError);
      setInvoice(updated);
      toast.success("Orden actualizada.", {
        href: commercialInvoicePath(updated.id),
      });
      setEditOpen(false);
      await reloadAll();
    } catch (err) {
      const message = getCommercialInvoicesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!invoice) return;
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "commercialInvoices"));
      return;
    }
    const label = formatCommercialInvoiceTitle(invoice);
    const printerWarning =
      invoice.printerCount > 0
        ? ` Esta factura tiene ${invoice.printerCount} impresora${invoice.printerCount === 1 ? "" : "s"} vinculada${invoice.printerCount === 1 ? "" : "s"} que quedarán sin factura (no está permitido eliminar si hay unidades a crédito o con permiso aprobado).`
        : "";
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar la orden ${label}? También se eliminarán sus pagos comerciales asociados.${printerWarning}`,
        destructive: true,
        requireConfirmationText: label,
      }))
    ) {
      return;
    }

    setDeleting(true);
    try {
      await deleteCommercialInvoice(invoice.id);
      toast.success("Orden eliminada.");
      router.push(commercialInvoicesListPath);
    } catch (err) {
      toast.error(getCommercialInvoicesErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handlePaymentSubmit(values: CommercialPaymentFormValues) {
    if (paymentDialog === "create" && !canCreatePayment) {
      setPaymentFormError(forbiddenMessage("create", "commercialPayments"));
      return;
    }
    if (paymentDialog === "edit" && !canModifyPayment) {
      setPaymentFormError(forbiddenMessage("update", "commercialPayments"));
      return;
    }

    const bodyOrError = toCommercialPaymentRequest(values);
    if (typeof bodyOrError === "string") {
      setPaymentFormError(bodyOrError);
      return;
    }

    setSavingPayment(true);
    setPaymentFormError(null);

    try {
      if (paymentDialog === "create") {
        const created = await createCommercialPayment(bodyOrError);
        toast.success("Pago comercial registrado.", {
          href: commercialPaymentPath(created.id),
        });
      } else if (selectedPayment) {
        await updateCommercialPayment(selectedPayment.id, bodyOrError);
        toast.success("Pago comercial actualizado.", {
          href: commercialPaymentPath(selectedPayment.id),
        });
      }
      setPaymentDialog(null);
      setSelectedPayment(null);
      await reloadAll();
    } catch (err) {
      const message = getCommercialPaymentsErrorMessage(err);
      setPaymentFormError(message);
      toast.error(message);
    } finally {
      setSavingPayment(false);
    }
  }

  const handleDeletePayment = useCallback(
    async (payment: CommercialPaymentResponse) => {
      if (!canDeletePayment) {
        toast.error(forbiddenMessage("delete", "commercialPayments"));
        return;
      }
      const confirmValue = payment.referencia?.trim() || `#${payment.id}`;
      const refLabel = payment.referencia
        ? `con referencia ${payment.referencia}`
        : `#${payment.id}`;
      if (
        !(await confirm({
          title: "Confirmar",
          message: `¿Eliminar el pago comercial ${refLabel}?`,
          destructive: true,
          requireConfirmationText: confirmValue,
        }))
      ) {
        return;
      }
      setDeletingPaymentId(payment.id);
      try {
        await deleteCommercialPayment(payment.id);
        toast.success("Pago comercial eliminado.");
        await reloadAll();
      } catch (err) {
        toast.error(getCommercialPaymentsErrorMessage(err));
      } finally {
        setDeletingPaymentId(null);
      }
    },
    [canDeletePayment, confirm, reloadAll, toast],
  );

  async function handlePrintersSubmit(printerIds: number[]) {
    if (!invoice) return;
    if (!canModify) {
      setPrintersFormError(forbiddenMessage("update", "commercialInvoices"));
      return;
    }

    setSavingPrinters(true);
    setPrintersFormError(null);

    try {
      const updated = await syncCommercialInvoicePrinters(
        invoice.id,
        printerIds,
      );
      setInvoice(updated);
      toast.success(
        `Impresoras actualizadas (${updated.printerCount} ${updated.printerCount === 1 ? "vinculada" : "vinculadas"}).`,
      );
      setPrintersDialogOpen(false);
      await reloadAll();
    } catch (err) {
      const message = getCommercialInvoicesErrorMessage(err);
      setPrintersFormError(message);
      toast.error(message);
    } finally {
      setSavingPrinters(false);
    }
  }

  const handleUnlinkPrinter = useCallback(
    async (printer: PrinterResponse) => {
      if (!invoice) return;
      if (!canModify) {
        toast.error(forbiddenMessage("update", "commercialInvoices"));
        return;
      }
      if (
        !(await confirm({
          title: "Desvincular impresora",
          message: `¿Desvincular la impresora ${printer.fiscalSerial} de la factura ${formatCommercialInvoiceTitle(invoice)}?`,
          confirmLabel: "Desvincular",
          destructive: true,
        }))
      ) {
        return;
      }
      setUnlinkingPrinterId(printer.id);
      try {
        const updated = await unlinkCommercialInvoicePrinter(
          invoice.id,
          printer.id,
        );
        setInvoice(updated);
        toast.success(`Impresora ${printer.fiscalSerial} desvinculada.`);
        await reloadAll();
      } catch (err) {
        toast.error(getCommercialInvoicesErrorMessage(err));
      } finally {
        setUnlinkingPrinterId(null);
      }
    },
    [canModify, confirm, invoice, reloadAll, toast],
  );

  const modelLabelById = useMemo(() => {
    const map = new Map<number, string>();
    for (const model of models) {
      map.set(model.id, printerModelLabel(model));
    }
    return map;
  }, [models]);

  const invoicePrinters = useMemo(() => {
    if (!invoice) return [];
    return printers
      .filter((p) => p.facturaComercialId === invoice.id)
      .sort((a, b) => a.fiscalSerial.localeCompare(b.fiscalSerial, "es"));
  }, [printers, invoice]);

  const handleMarkAsPaid = useCallback(async () => {
    if (!invoice) return;
    if (!canModify) {
      toast.error(forbiddenMessage("update", "commercialInvoices"));
      return;
    }
    const label = formatCommercialInvoiceTitle(invoice);
    const creditPrintersCount = invoicePrinters.filter(
      (p) => p.status === "a_credito",
    ).length;
    const message =
      creditPrintersCount > 0
        ? `¿Marcar la factura ${label} como Pagada? ${creditPrintersCount === 1 ? "La impresora asociada en estatus A crédito pasará" : `Las ${creditPrintersCount} impresoras asociadas en estatus A crédito pasarán`} automáticamente a Enajenada.`
        : `¿Marcar la factura ${label} como Pagada?`;

    if (
      !(await confirm({
        title: "Marcar factura como pagada",
        message,
        confirmLabel: "Marcar como pagada",
        destructive: false,
      }))
    ) {
      return;
    }

    setMarkingPaid(true);
    try {
      const updated = await markCommercialInvoiceAsPaid(invoice.id);
      setInvoice(updated);
      toast.success(
        `Orden ${formatCommercialInvoiceTitle(updated)} marcada como pagada.`,
        { href: commercialInvoicePath(updated.id) },
      );
      await reloadAll();
    } catch (err) {
      toast.error(getCommercialInvoicesErrorMessage(err));
    } finally {
      setMarkingPaid(false);
    }
  }, [canModify, confirm, invoice, invoicePrinters, reloadAll, toast]);

  const detailSteps = useMemo((): DetailPagerStep[] => {
    if (!invoice) return [];

    const printersTabCount = printersLoading
      ? invoice.printerCount
      : invoicePrinters.length;

    return [
      {
        id: "invoice",
        label: "Factura",
        content: (
          <DetailSection title="Orden" layout="quad">
            <DetailField
              label="Número de orden"
              value={invoice.numeroFactura?.trim() || "Sin número"}
              mono
            />
            <DetailField
              label="Empresa"
              value={
                invoice.empresaNombre ??
                invoice.clienteComercialNombre ??
                "—"
              }
              href={
                user ? hrefForCompany(invoice.empresaId, user.role) : undefined
              }
            />
            <DetailField
              label="Modalidad"
              value={
                <CommercialInvoiceModalityBadge modality={invoice.modalidad} />
              }
            />
            <DetailField
              label="Estado de cobro"
              value={
                <CommercialInvoiceCollectionStatusBadge
                  status={invoice.estadoCobro}
                />
              }
            />
            <DetailField
              label="Monto total"
              value={
                invoice.montoTotal != null
                  ? formatMoney(invoice.montoTotal)
                  : "Sin definir"
              }
            />
            <DetailField
              label="Total abonado"
              value={formatMoney(invoice.paidAmountTotal)}
            />
            <DetailField
              label="Saldo pendiente"
              value={
                invoice.remainingBalance != null
                  ? formatMoney(invoice.remainingBalance)
                  : "—"
              }
            />
            <DetailField
              label="Pagos registrados"
              value={String(invoice.paymentCount)}
            />
            <DetailField
              label="Impresoras asociadas"
              value={String(invoice.printerCount)}
            />
            <DetailField label="Registro" value={formatDate(invoice.createdAt)} />
            {canModify && invoice.estadoCobro !== "PAGADO" ? (
              <div className="col-span-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-muted">
                  Al marcar como pagada, las impresoras vinculadas en estatus A
                  crédito pasarán a Enajenada.
                </p>
                <button
                  type="button"
                  disabled={markingPaid}
                  onClick={() => void handleMarkAsPaid()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-300"
                >
                  {markingPaid ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <CheckCircle2 className="size-3.5" aria-hidden />
                  )}
                  Marcar como pagada
                </button>
              </div>
            ) : null}
          </DetailSection>
        ),
      },
      {
        id: "payments",
        label: `Pagos (${payments.length})`,
        content: (
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-card-foreground">
                Pagos comerciales registrados
              </h3>
              {canCreatePayment ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPayment(null);
                    setPaymentFormError(null);
                    setPaymentDialog("create");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90"
                >
                  <Plus className="size-3.5" aria-hidden />
                  Registrar pago
                </button>
              ) : null}
            </div>

            {payments.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                Aún no hay pagos comerciales registrados para esta factura.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                      <th className="px-4 py-2.5 font-medium">
                        Método / Banco
                      </th>
                      <th className="px-4 py-2.5 font-medium">Monto</th>
                      <th className="px-4 py-2.5 font-medium">Referencia</th>
                      <th className="px-4 py-2.5 font-medium">
                        Cuenta destino
                      </th>
                      <th className="px-4 py-2.5 font-medium">Fecha de pago</th>
                      <th className="px-4 py-2.5 font-medium">Notas</th>
                      <th className="px-4 py-2.5 font-medium">
                        Registrado por
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <ClickableTableRow
                        key={payment.id}
                        href={commercialPaymentPath(payment.id)}
                      >
                        <td className="px-4 py-2.5">
                          <CommercialPaymentMethodBadge
                            method={payment.metodoBanco}
                          />
                        </td>
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap text-card-foreground">
                          {formatMoney(payment.monto)}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-muted">
                          <TruncatedText mono maxClassName="max-w-[160px]">
                            {payment.referencia ?? "—"}
                          </TruncatedText>
                        </td>
                        <td className="px-4 py-2.5 text-muted">
                          <TruncatedText maxClassName="max-w-[160px]">
                            {payment.cuentaDestino ?? "—"}
                          </TruncatedText>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted">
                          {formatDate(payment.fechaPago ?? payment.createdAt)}
                        </td>
                        <td className="px-4 py-2.5 text-muted">
                          <TruncatedText maxClassName="max-w-[180px]">
                            {payment.notas ?? "—"}
                          </TruncatedText>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted">
                          {payment.registeredByName ?? "—"}
                        </td>
                        <td
                          className="px-4 py-2.5"
                          data-row-click="ignore"
                        >
                          <TableRowActionsMenu
                            viewHref={commercialPaymentPath(payment.id)}
                            viewLabel={`Ver pago #${payment.id}`}
                            onEdit={
                              canModifyPayment
                                ? () => {
                                    setSelectedPayment(payment);
                                    setPaymentFormError(null);
                                    setPaymentDialog("edit");
                                  }
                                : undefined
                            }
                            onDelete={
                              canDeletePayment
                                ? () => void handleDeletePayment(payment)
                                : undefined
                            }
                            deleting={deletingPaymentId === payment.id}
                          />
                        </td>
                      </ClickableTableRow>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ),
      },
      {
        id: "printers",
        label: `Impresoras (${printersTabCount})`,
        content: (
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-card-foreground">
                Impresoras asociadas
              </h3>
              {canModify ? (
                <button
                  type="button"
                  onClick={() => {
                    setPrintersFormError(null);
                    setPrintersDialogOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90"
                >
                  <Plus className="size-3.5" aria-hidden />
                  Asociar impresoras
                </button>
              ) : null}
            </div>

            {printersLoading ? (
              <p className="mt-4 text-sm text-muted">Cargando impresoras…</p>
            ) : invoicePrinters.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                Aún no hay impresoras asociadas a esta factura.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                      <th className="px-4 py-2.5 font-medium">
                        Serial fiscal
                      </th>
                      <th className="px-4 py-2.5 font-medium">Modelo</th>
                      <th className="px-4 py-2.5 font-medium">Estatus</th>
                      <th className="px-4 py-2.5 font-medium">Caja</th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoicePrinters.map((printer) => {
                      const isProtected =
                        printer.status === "a_credito" ||
                        (printer.status === "en_consignacion" &&
                          Boolean(printer.enajenacionAutorizada));
                      return (
                        <ClickableTableRow
                          key={printer.id}
                          href={printerPath(printer.id)}
                        >
                          <td className="px-4 py-2.5 font-mono font-medium whitespace-nowrap text-card-foreground">
                            {printer.fiscalSerial}
                          </td>
                          <td className="px-4 py-2.5 text-muted">
                            {modelLabelById.get(printer.modelId) ??
                              `Modelo #${printer.modelId}`}
                          </td>
                          <td className="px-4 py-2.5">
                            <PrinterStatusBadge status={printer.status} />
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-muted">
                            {printer.boxNumber != null
                              ? formatInventoryBoxLabel(printer.boxNumber)
                              : "—"}
                          </td>
                          <td
                            className="px-4 py-2.5"
                            data-row-click="ignore"
                          >
                            <TableRowActionsMenu
                              viewHref={printerPath(printer.id)}
                              viewLabel={`Ver impresora ${printer.fiscalSerial}`}
                              onDelete={
                                canModify && !isProtected
                                  ? () => void handleUnlinkPrinter(printer)
                                  : undefined
                              }
                              deleteLabel="Desvincular"
                              deleting={unlinkingPrinterId === printer.id}
                            />
                          </td>
                        </ClickableTableRow>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ),
      },
    ];
  }, [
    invoice,
    payments,
    canCreatePayment,
    canModifyPayment,
    canDeletePayment,
    deletingPaymentId,
    handleDeletePayment,
    canModify,
    markingPaid,
    handleMarkAsPaid,
    printersLoading,
    invoicePrinters,
    modelLabelById,
    unlinkingPrinterId,
    handleUnlinkPrinter,
    user,
  ]);

  const effectiveError =
    id == null ? "Identificador de orden no válido." : error;
  const effectiveLoading = id != null && loading;

  return (
    <>
      <ResourceViewShell
        backHref={commercialInvoicesListPath}
        backLabel="Volver a órdenes"
        title={
          invoice ? formatCommercialInvoiceTitle(invoice) : "Orden"
        }
        subtitle={invoice?.clienteComercialNombre ?? undefined}
        loading={effectiveLoading}
        error={effectiveError}
        actions={
          invoice ? (
            <ResourceViewActions
              onEdit={
                canModify
                  ? () => {
                      setFormError(null);
                      setEditOpen(true);
                    }
                  : undefined
              }
              onDelete={canDelete ? () => void handleDelete() : undefined}
              deleting={deleting}
            />
          ) : undefined
        }
      >
        {invoice && (
          <DetailSectionsPager key={invoice.id} steps={detailSteps} />
        )}
      </ResourceViewShell>

      {invoice && editOpen && (
        <CommercialInvoiceFormDialog
          mode="edit"
          invoice={invoice}
          open={editOpen}
          saving={saving}
          error={formError}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={(values) => void handleSubmit(values)}
        />
      )}

      {invoice && paymentDialog && (
        <CommercialPaymentFormDialog
          mode={paymentDialog}
          payment={selectedPayment ?? undefined}
          defaultInvoiceId={invoice.id}
          lockInvoice={paymentDialog === "create"}
          invoices={[invoice]}
          open={Boolean(paymentDialog)}
          saving={savingPayment}
          error={paymentFormError}
          onClose={() => {
            if (!savingPayment) {
              setPaymentDialog(null);
              setSelectedPayment(null);
            }
          }}
          onSubmit={(values) => void handlePaymentSubmit(values)}
        />
      )}

      {invoice && printersDialogOpen && (
        <CommercialInvoicePrintersDialog
          open={printersDialogOpen}
          invoice={invoice}
          printers={printers}
          models={models}
          catalogLoading={printersLoading}
          saving={savingPrinters}
          error={printersFormError}
          onClose={() => {
            if (!savingPrinters) setPrintersDialogOpen(false);
          }}
          onSubmit={(printerIds) => void handlePrintersSubmit(printerIds)}
        />
      )}
    </>
  );
}
