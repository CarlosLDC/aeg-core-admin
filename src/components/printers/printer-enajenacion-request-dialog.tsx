"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { PrinterActionDialogShell } from "@/components/printers/printer-action-dialog-shell";
import { FieldLabel } from "@/components/ui/field-label";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { formatDate } from "@/lib/datetime-form";
import {
  cancelPrinterEnajenacionRequest,
  createPrinterEnajenacionRequest,
  fetchPendingPrinterEnajenacionRequest,
  getPrinterEnajenacionRequestsErrorMessage,
} from "@/lib/printer-enajenacion-requests-api";
import { printerEnajenacionReviewPath } from "@/lib/resource-routes";
import type { PrinterResponse } from "@/types/printer";
import type { PrinterEnajenacionRequestDetailResponse } from "@/types/printer-enajenacion-request";

type PrinterEnajenacionRequestDialogProps = {
  printer: PrinterResponse;
  isAdmin: boolean;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
};

export function PrinterEnajenacionRequestDialog({
  printer,
  isAdmin,
  onClose,
  onUpdated,
}: PrinterEnajenacionRequestDialogProps) {
  const titleId = useId();
  const toast = useToast();
  const confirm = useConfirm();

  const [suggestedInstallments, setSuggestedInstallments] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingLoading, setPendingLoading] = useState(
    printer.pendingEnajenacionRequestId != null,
  );
  const [pendingRequest, setPendingRequest] =
    useState<PrinterEnajenacionRequestDetailResponse | null>(null);

  useEffect(() => {
    if (printer.pendingEnajenacionRequestId == null) {
      setPendingRequest(null);
      setPendingLoading(false);
      return;
    }
    let cancelled = false;
    setPendingLoading(true);
    fetchPendingPrinterEnajenacionRequest(printer.id)
      .then((res) => {
        if (!cancelled) setPendingRequest(res);
      })
      .finally(() => {
        if (!cancelled) setPendingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [printer.id, printer.pendingEnajenacionRequestId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    let parsedInstallments: number | null = null;
    if (suggestedInstallments.trim()) {
      const n = Number(suggestedInstallments.trim());
      if (!Number.isInteger(n) || n < 1) {
        setError("Las cuotas sugeridas deben ser un número entero mayor o igual a 1.");
        return;
      }
      parsedInstallments = n;
    }

    setSaving(true);
    try {
      await createPrinterEnajenacionRequest({
        printerId: printer.id,
        suggestedInstallments: parsedInstallments,
        notes: notes.trim() || null,
      });
      toast.success(
        `Solicitud de permiso para enajenar ${printer.fiscalSerial} enviada al administrador.`,
      );
      await onUpdated();
      onClose();
    } catch (err) {
      const message = getPrinterEnajenacionRequestsErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelPending() {
    const requestId = pendingRequest?.id ?? printer.pendingEnajenacionRequestId;
    if (requestId == null) return;
    const ok = await confirm({
      title: "Cancelar solicitud",
      message: `¿Cancelar la solicitud pendiente de enajenación para la impresora ${printer.fiscalSerial}?`,
      destructive: true,
    });
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      await cancelPrinterEnajenacionRequest(requestId);
      toast.success("Solicitud de enajenación cancelada.");
      await onUpdated();
      onClose();
    } catch (err) {
      const message = getPrinterEnajenacionRequestsErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (printer.pendingEnajenacionRequestId != null) {
    return (
      <PrinterActionDialogShell
        title={`Permiso solicitado · ${printer.fiscalSerial}`}
        titleId={titleId}
        printer={printer}
        showPrinterSerialSubtitle={false}
        saving={saving}
        error={error}
        onClose={onClose}
        onSubmit={(e) => {
          e.preventDefault();
          void handleCancelPending();
        }}
        submitLabel="Cancelar solicitud"
        submitDisabled={pendingLoading}
        cancelLabel="Cerrar"
      >
        {pendingLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            Cargando detalles de la solicitud…
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-muted">
              Ya existe una solicitud pendiente de revisión por parte del administrador. Una vez aprobada, se habilitará el botón{" "}
              <strong className="text-foreground">Enajenar</strong> y la impresora pasará al estatus{" "}
              <strong className="text-foreground">A crédito</strong> al completar la enajenación.
            </p>
            <div className="space-y-2 rounded-lg border border-border bg-foreground/[0.02] p-3.5">
              <div className="flex justify-between gap-4">
                <span className="text-muted">Solicitado por</span>
                <span className="font-medium text-foreground">
                  {pendingRequest?.requestedByName ?? "—"}
                </span>
              </div>
              {pendingRequest?.createdAt ? (
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Fecha</span>
                  <span className="text-foreground">
                    {formatDate(pendingRequest.createdAt)}
                  </span>
                </div>
              ) : null}
              {pendingRequest?.suggestedInstallments != null ? (
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Cuotas sugeridas</span>
                  <span className="font-medium text-foreground">
                    {pendingRequest.suggestedInstallments}
                  </span>
                </div>
              ) : null}
              {pendingRequest?.notes ? (
                <div className="pt-1">
                  <span className="block text-muted">Notas</span>
                  <p className="mt-1 whitespace-pre-wrap text-foreground">
                    {pendingRequest.notes}
                  </p>
                </div>
              ) : null}
            </div>
            {isAdmin ? (
              <div>
                <Link
                  href={printerEnajenacionReviewPath(
                    pendingRequest?.id ?? printer.pendingEnajenacionRequestId,
                  )}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  Ir a revisar y aprobar solicitud
                  <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </PrinterActionDialogShell>
    );
  }

  return (
    <PrinterActionDialogShell
      title={`Solicitar permiso para enajenar · ${printer.fiscalSerial}`}
      titleId={titleId}
      printer={printer}
      showPrinterSerialSubtitle={false}
      saving={saving}
      error={error}
      onClose={onClose}
      onSubmit={(e) => void handleSubmit(e)}
      submitLabel="Enviar solicitud"
      cancelLabel="Cancelar"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Las impresoras en estatus <strong className="text-foreground">En consignación</strong>{" "}
          requieren autorización previa del administrador para poder enajenarse. Al aprobarse,
          podrás enajenarla y quedará registrada <strong className="text-foreground">A crédito</strong>.
        </p>

        <div>
          <FieldLabel>
            Cuotas sugeridas (opcional)
          </FieldLabel>
          <input
            id="suggested-installments"
            type="number"
            min={1}
            step={1}
            value={suggestedInstallments}
            onChange={(e) => setSuggestedInstallments(e.target.value)}
            placeholder="Ej. 4"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <FieldLabel>
            Motivo o detalles para el administrador (opcional)
          </FieldLabel>
          <textarea
            id="enajenacion-request-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Cliente interesado en adquirir el equipo en 4 cuotas mensuales."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>
    </PrinterActionDialogShell>
  );
}
