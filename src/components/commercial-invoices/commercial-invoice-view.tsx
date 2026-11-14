"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
        requireConfirmationText: label,
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

  const detailSteps = useMemo((): DetailPagerStep[] => {
    if (!invoice) return [];

    return [
      {
        id: "invoice",
        label: "Factura",
        content: (
          <DetailSection title="Factura comercial" layout="quad">
            <DetailField
              label="Número de factura"
              value={invoice.numeroFactura ?? "—"}
              mono
            />
            <DetailField
              label="Empresa"
              value={
                invoice.empresaNombre ??
                invoice.clienteComercialNombre ??
                "—"
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
              label="Total abonado"
              value={formatMoney(invoice.paidAmountTotal)}
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
                      <th className="px-4 py-2.5 font-medium">Fecha</th>
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
                          {formatDate(payment.createdAt)}
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
    ];
  }, [
    invoice,
    payments,
    canCreatePayment,
    canModifyPayment,
    canDeletePayment,
    deletingPaymentId,
    handleDeletePayment,
  ]);

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
    </>
  );
}
