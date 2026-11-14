"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CommercialInvoiceCollectionStatusBadge,
  CommercialInvoiceModalityBadge,
} from "@/components/commercial-invoices/commercial-invoice-badges";
import { CommercialInvoiceFormDialog } from "@/components/commercial-invoices/commercial-invoice-form-dialog";
import { CommercialPaymentFormDialog } from "@/components/commercial-payments/commercial-payment-form-dialog";
import { CommercialPaymentMethodBadge } from "@/components/commercial-payments/commercial-payment-method-badge";
import {
  DetailField,
  DetailSection,
} from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { EmptyState } from "@/components/ui/empty-state";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { TableScroll } from "@/components/ui/table-scroll";
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
import { forbiddenMessage } from "@/lib/permissions/messages";
import {
  commercialInvoicePath,
  commercialInvoicesListPath,
  commercialPaymentPath,
} from "@/lib/resource-routes";
import type {
  CommercialInvoiceFormValues,
  CommercialInvoiceResponse,
} from "@/types/commercial-invoice";
import type {
  CommercialPaymentFormValues,
  CommercialPaymentResponse,
} from "@/types/commercial-payment";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      const [invoiceData, paymentsData] = await Promise.all([
        fetchCommercialInvoiceById(id),
        fetchCommercialPayments(id),
      ]);
      setInvoice(invoiceData);
      setPayments(paymentsData);
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
        const [invoiceData, paymentsData] = await Promise.all([
          fetchCommercialInvoiceById(id),
          fetchCommercialPayments(id),
        ]);
        if (!active) return;
        setInvoice(invoiceData);
        setPayments(paymentsData);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(getCommercialInvoicesErrorMessage(err));
      } finally {
        if (active) setLoading(false);
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
      toast.success("Factura comercial actualizada.", {
        href: commercialInvoicePath(updated.id),
      });
      setEditOpen(false);
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
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar la factura comercial ${label}? También se eliminarán sus pagos comerciales asociados.`,
        destructive: true,
      }))
    ) {
      return;
    }

    setDeleting(true);
    try {
      await deleteCommercialInvoice(invoice.id);
      toast.success("Factura comercial eliminada.");
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

  async function handleDeletePayment(payment: CommercialPaymentResponse) {
    if (!canDeletePayment) {
      toast.error(forbiddenMessage("delete", "commercialPayments"));
      return;
    }
    const refLabel = payment.referencia
      ? `con referencia ${payment.referencia}`
      : `#${payment.id}`;
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar el pago comercial ${refLabel}?`,
        destructive: true,
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
  }

  const effectiveError =
    id == null ? "Identificador de factura comercial no válido." : error;
  const effectiveLoading = id != null && loading;

  return (
    <>
      <ResourceViewShell
        backHref={commercialInvoicesListPath}
        backLabel="Volver a facturas comerciales"
        title={
          invoice ? formatCommercialInvoiceTitle(invoice) : "Factura comercial"
        }
        subtitle={invoice?.facturaCliente ?? undefined}
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
          <div className="space-y-6">
            <DetailSection title="Factura comercial" layout="quad">
              <DetailField
                label="Número de factura"
                value={invoice.numeroFactura ?? "—"}
                mono
              />
              <DetailField
                label="Sufijo de control"
                value={invoice.sufijoControl ?? "—"}
                mono
              />
              <DetailField
                label="Cliente (factura)"
                value={invoice.facturaCliente ?? "—"}
              />
              <DetailField
                label="Promotor / Vendedor"
                value={invoice.promotorVendedor ?? "—"}
              />
              <DetailField
                label="Modalidad"
                value={
                  <CommercialInvoiceModalityBadge
                    modality={invoice.modalidad}
                  />
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
                label="Total abonado"
                value={formatMoney(invoice.paidAmountTotal)}
                mono
              />
              <DetailField
                label="Pagos registrados"
                value={invoice.paymentCount}
                mono
              />
              <DetailField
                label="Impresoras asociadas"
                value={invoice.printerCount}
                mono
              />
              <DetailField
                label="Registro"
                value={formatDate(invoice.createdAt)}
              />
              <DetailField
                label="Notas comerciales"
                span={4}
                value={
                  invoice.notasComerciales ? (
                    <span className="whitespace-pre-wrap text-card-foreground">
                      {invoice.notasComerciales}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </DetailSection>

            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-card-foreground">
                    Pagos comerciales asociados
                  </h3>
                  <p className="mt-0.5 text-xs text-muted">
                    {payments.length} pago{payments.length === 1 ? "" : "s"}{" "}
                    vinculado{payments.length === 1 ? "" : "s"} a esta factura.
                  </p>
                </div>
                {canCreatePayment ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPayment(null);
                      setPaymentFormError(null);
                      setPaymentDialog("create");
                    }}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground"
                  >
                    <Plus className="size-4" />
                    Registrar pago
                  </button>
                ) : null}
              </div>

              {payments.length === 0 ? (
                <EmptyState title="No hay pagos comerciales registrados para esta factura." />
              ) : (
                <TableScroll>
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="px-5 py-3 font-medium">
                          Método / Banco
                        </th>
                        <th className="px-5 py-3 font-medium">Monto</th>
                        <th className="px-5 py-3 font-medium">Referencia</th>
                        <th className="px-5 py-3 font-medium">
                          Cuenta destino
                        </th>
                        <th className="px-5 py-3 font-medium">Fecha</th>
                        <th className="px-5 py-3 text-right font-medium">
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
                          <td className="px-5 py-3.5">
                            <CommercialPaymentMethodBadge
                              method={payment.metodoBanco}
                            />
                          </td>
                          <td className="px-5 py-3.5 font-mono font-medium text-card-foreground">
                            {formatMoney(payment.monto)}
                          </td>
                          <td className="max-w-[180px] px-5 py-3.5 font-mono text-muted">
                            <TruncatedText mono maxClassName="max-w-[160px]">
                              {payment.referencia ?? "—"}
                            </TruncatedText>
                          </td>
                          <td className="max-w-[180px] px-5 py-3.5 text-muted">
                            <TruncatedText maxClassName="max-w-[160px]">
                              {payment.cuentaDestino ?? "—"}
                            </TruncatedText>
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatDate(payment.createdAt)}
                          </td>
                          <td
                            className="px-5 py-3.5"
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
                </TableScroll>
              )}
            </section>
          </div>
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
    </>
  );
}
