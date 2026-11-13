"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";
import { DetailCard, DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import { FieldLabel } from "@/components/ui/field-label";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import { formatDate } from "@/lib/datetime-form";
import { formatResourceId } from "@/lib/format-resource-id";
import {
  approvePrinterEnajenacionRequest,
  fetchPrinterEnajenacionRequestById,
  getPrinterEnajenacionRequestsErrorMessage,
  rejectPrinterEnajenacionRequest,
} from "@/lib/printer-enajenacion-requests-api";
import { printerPath } from "@/lib/resource-routes";
import type { ModificationRequestStatus } from "@/types/client-modification-request";
import type { PrinterEnajenacionRequestDetailResponse } from "@/types/printer-enajenacion-request";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ModificationRequestStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

const STATUS_STYLES: Record<ModificationRequestStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
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
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de solicitud no válido.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPrinterEnajenacionRequestById(id);
      setRow(data);
      const initialInstallments =
        data.suggestedInstallments ?? data.currentCreditInstallments ?? 1;
      setCreditInstallments(String(initialInstallments));
      setFinalSalePrice(
        data.finalSalePrice != null ? String(data.finalSalePrice) : "",
      );
    } catch (err) {
      setError(getPrinterEnajenacionRequestsErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const canReview = row?.status === "PENDING";

  async function handleApprove() {
    if (!row) return;
    setFormError(null);

    const parsedInstallments = Number(creditInstallments.trim());
    if (!Number.isInteger(parsedInstallments) || parsedInstallments < 1) {
      setFormError("Debes indicar un número de cuotas válido (entero >= 1).");
      return;
    }

    let parsedPrice: number | null = null;
    if (finalSalePrice.trim()) {
      const n = Number(finalSalePrice.trim());
      if (!Number.isFinite(n) || n < 0) {
        setFormError("El monto total de venta no puede ser negativo.");
        return;
      }
      parsedPrice = n;
    }

    const ok = await confirm({
      title: "Autorizar enajenación a crédito",
      message: `¿Autorizar la enajenación de la impresora ${row.fiscalSerial} en ${parsedInstallments} cuota${parsedInstallments === 1 ? "" : "s"}? El distribuidor podrá ver el botón Enajenar y al completar el proceso la impresora pasará al estatus A crédito.`,
      destructive: false,
    });
    if (!ok) return;

    setSaving(true);
    try {
      const updated = await approvePrinterEnajenacionRequest(row.id, {
        creditInstallments: parsedInstallments,
        finalSalePrice: parsedPrice,
        reviewNote: reviewNote.trim() || null,
      });
      setRow(updated);
      toast.success(
        `Permiso aprobado para ${row.fiscalSerial} (${parsedInstallments} cuotas).`,
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

  return (
    <ResourceViewShell
      backHref={backHref}
      backLabel="Volver a revisiones"
      title={row ? `Permiso de enajenación · ${row.fiscalSerial}` : "Solicitud de enajenación"}
      subtitle={row ? `${formatResourceId(row.id)} · ${row.distributorName}` : undefined}
      loading={loading}
      error={error}
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
              disabled={saving}
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
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
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
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
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
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              {formError ? (
                <p
                  role="alert"
                  className="sm:col-span-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
                >
                  {formError}
                </p>
              ) : null}
            </DetailSection>
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
