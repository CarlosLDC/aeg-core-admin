"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CommercialPaymentFormDialog } from "@/components/commercial-payments/commercial-payment-form-dialog";
import { CommercialPaymentMethodBadge } from "@/components/commercial-payments/commercial-payment-method-badge";
import {
  DetailField,
  DetailSection,
} from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDeleteCommercialPaymentRecord,
  canModifyCommercialPaymentRecord,
} from "@/lib/api-permissions";
import { formatCommercialInvoiceTitle } from "@/lib/commercial-invoice-form";
import { fetchCommercialInvoices } from "@/lib/commercial-invoices-api";
import { toCommercialPaymentRequest } from "@/lib/commercial-payment-form";
import {
  deleteCommercialPayment,
  fetchCommercialPaymentById,
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
import type { CommercialInvoiceResponse } from "@/types/commercial-invoice";
import type {
  CommercialPaymentFormValues,
  CommercialPaymentResponse,
} from "@/types/commercial-payment";

export function CommercialPaymentView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();

  const canModify = user ? canModifyCommercialPaymentRecord(user.role) : false;
  const canDelete = user ? canDeleteCommercialPaymentRecord(user.role) : false;

  const [payment, setPayment] = useState<CommercialPaymentResponse | null>(
    null,
  );
  const [invoices, setInvoices] = useState<CommercialInvoiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (id == null) {
      return;
    }
    let active = true;
    void (async () => {
      try {
        const [paymentData, invoicesData] = await Promise.all([
          fetchCommercialPaymentById(id),
          fetchCommercialInvoices().catch(() => []),
        ]);
        if (!active) return;
        setPayment(paymentData);
        setInvoices(invoicesData);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(getCommercialPaymentsErrorMessage(err));
      } finally {
        if (active) {
          setLoading(false);
          setInvoicesLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmit(values: CommercialPaymentFormValues) {
    if (!payment) return;
    if (!canModify) {
      setFormError(forbiddenMessage("update", "commercialPayments"));
      return;
    }

    const bodyOrError = toCommercialPaymentRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const updated = await updateCommercialPayment(payment.id, bodyOrError);
      setPayment(updated);
      toast.success("Pago comercial actualizado.", {
        href: commercialPaymentPath(updated.id),
      });
      setEditOpen(false);
    } catch (err) {
      const message = getCommercialPaymentsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!payment) return;
    if (!canDelete) {
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

    setDeleting(true);
    try {
      await deleteCommercialPayment(payment.id);
      toast.success("Pago comercial eliminado.");
      router.push(commercialInvoicePath(payment.facturaComercialId));
    } catch (err) {
      toast.error(getCommercialPaymentsErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const effectiveError =
    id == null ? "Identificador de pago comercial no válido." : error;
  const effectiveLoading = id != null && loading;

  const linkedInvoice = payment
    ? invoices.find((inv) => inv.id === payment.facturaComercialId)
    : undefined;
  const invoiceLabel = payment
    ? formatCommercialInvoiceTitle({
        id: payment.facturaComercialId,
        numeroFactura: payment.numeroFactura ?? linkedInvoice?.numeroFactura,
        sufijoControl: linkedInvoice?.sufijoControl,
      })
    : "Pago comercial";

  return (
    <>
      <ResourceViewShell
        backHref={
          payment
            ? commercialInvoicePath(payment.facturaComercialId)
            : commercialInvoicesListPath
        }
        backLabel={
          payment
            ? "Volver a la factura comercial"
            : "Volver a facturas comerciales"
        }
        title={
          payment
            ? payment.referencia || `Pago #${payment.id}`
            : "Pago comercial"
        }
        subtitle={payment ? invoiceLabel : undefined}
        loading={effectiveLoading}
        error={effectiveError}
        actions={
          payment ? (
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
        {payment && (
          <DetailSection title="Pago comercial" layout="quad">
            <DetailField
              label="Factura comercial"
              value={invoiceLabel}
              href={commercialInvoicePath(payment.facturaComercialId)}
              mono
            />
            <DetailField
              label="Cliente comercial"
              value={
                payment.clienteComercialNombre ??
                linkedInvoice?.clienteComercialNombre ??
                "Sin asignar"
              }
            />
            <DetailField
              label="Método / Banco"
              value={
                <CommercialPaymentMethodBadge method={payment.metodoBanco} />
              }
            />
            <DetailField label="Monto" value={formatMoney(payment.monto)} />
            <DetailField
              label="Referencia"
              value={payment.referencia ?? "—"}
              mono
            />
            <DetailField
              label="Cuenta destino"
              value={payment.cuentaDestino ?? "—"}
            />
            <DetailField
              label="Fecha de registro"
              value={formatDate(payment.createdAt)}
            />
          </DetailSection>
        )}
      </ResourceViewShell>

      {payment && editOpen && (
        <CommercialPaymentFormDialog
          mode="edit"
          payment={payment}
          invoices={invoices}
          invoicesLoading={invoicesLoading}
          open={editOpen}
          saving={saving}
          error={formError}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={(values) => void handleSubmit(values)}
        />
      )}
    </>
  );
}
