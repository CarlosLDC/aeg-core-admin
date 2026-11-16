"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { ClientModificationComparison } from "@/components/clients/client-modification-comparison";
import { DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import {
  DetailSectionsPager,
  type DetailPagerStep,
} from "@/components/resource-view/detail-sections-pager";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import { buildClientComparisonRows } from "@/lib/client-modification-comparison";
import {
  approveClientModificationRequest,
  fetchClientModificationRequestById,
  getClientModificationRequestsErrorMessage,
  rejectClientModificationRequest,
} from "@/lib/client-modification-requests-api";
import { formatDate } from "@/lib/datetime-form";
import { formatResourceId } from "@/lib/format-resource-id";
import { clientPath } from "@/lib/resource-routes";
import type {
  ClientModificationRequestDetailResponse,
  ModificationRequestStatus,
} from "@/types/client-modification-request";

const STATUS_LABELS: Record<ModificationRequestStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

type ClientModificationRequestViewProps = {
  backHref?: string;
};

export function ClientModificationRequestView({
  backHref = "/reviews?section=clients",
}: ClientModificationRequestViewProps) {
  const id = useResourceId();
  const toast = useToast();
  const confirm = useConfirm();
  const [row, setRow] = useState<ClientModificationRequestDetailResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de solicitud no válido.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRow(await fetchClientModificationRequestById(id));
    } catch (err) {
      setError(getClientModificationRequestsErrorMessage(err));
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
    if (
      !(await confirm({
        title: "Confirmar",
        message: "¿Aprobar esta solicitud?",
        destructive: false,
      }))
    ) {
      return;
    }
    setSaving(true);
    try {
      const updated = await approveClientModificationRequest(row.id);
      setRow(updated);
      toast.success("Solicitud aprobada.");
    } catch (err) {
      toast.error(getClientModificationRequestsErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!row) return;
    if (
      !(await confirm({
        title: "Confirmar",
        message: "¿Rechazar esta solicitud?",
        destructive: true,
      }))
    ) {
      return;
    }
    setSaving(true);
    try {
      const updated = await rejectClientModificationRequest(row.id);
      setRow(updated);
      toast.success("Solicitud rechazada.");
    } catch (err) {
      toast.error(getClientModificationRequestsErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const comparison = useMemo(
    () => (row ? buildClientComparisonRows(row) : []),
    [row],
  );

  const detailSteps = useMemo<DetailPagerStep[]>(() => {
    if (!row || row.actionType !== "UPDATE") return [];
    return [
      {
        id: "metadata",
        label: "Metadatos",
        content: (
          <DetailSection title="Metadatos" layout="quad">
            <DetailField label="Solicitud" value={formatResourceId(row.id)} mono />
            <DetailField
              label="Cliente"
              value={
                row.currentClientSnapshot?.businessName ??
                row.proposedData?.businessName ??
                "Cliente eliminado"
              }
              href={row.currentClientSnapshot ? clientPath(row.clientId) : undefined}
            />
            <DetailField label="Acción" value={row.actionType} />
            <DetailField label="Estado" value={STATUS_LABELS[row.status]} />
            <DetailField label="Solicitado por" value={row.requestedByName} />
            <DetailField label="Fecha" value={formatDate(row.createdAt)} />
          </DetailSection>
        ),
      },
      {
        id: "comparison",
        label: "Comparación",
        content: <ClientModificationComparison rows={comparison} />,
      },
    ];
  }, [comparison, row]);

  return (
    <ResourceViewShell
      backHref={backHref}
      backLabel="Volver a solicitudes"
      title={row ? `Solicitud ${formatResourceId(row.id)}` : "Solicitud de modificación"}
      subtitle={row ? STATUS_LABELS[row.status] : undefined}
      loading={loading}
      error={error}
      actions={
        row ? (
          <ResourceViewActions
            editLabel="Aprobar"
            deleteLabel="Rechazar"
            onEdit={canReview ? () => void handleApprove() : undefined}
            onDelete={canReview ? () => void handleReject() : undefined}
            deleting={saving}
          />
        ) : undefined
      }
    >
      {!row ? null : (
        <div className="space-y-4">
          {saving && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" />
              Procesando solicitud…
            </div>
          )}
          {row.actionType === "DELETE" ? (
            <>
              {canReview ? (
                <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                  Esta acción eliminará el vínculo del cliente. Verifica que no
                  existan impresoras asociadas antes de aprobar.
                </p>
              ) : null}
              <DetailSection title="Metadatos" layout="quad">
                <DetailField label="Solicitud" value={formatResourceId(row.id)} mono />
                <DetailField
                  label="Cliente"
                  value={
                    row.currentClientSnapshot?.businessName ??
                    row.proposedData?.businessName ??
                    "Cliente eliminado"
                  }
                  href={row.currentClientSnapshot ? clientPath(row.clientId) : undefined}
                />
                <DetailField label="Acción" value={row.actionType} />
                <DetailField label="Estado" value={STATUS_LABELS[row.status]} />
                <DetailField label="Solicitado por" value={row.requestedByName} />
                <DetailField label="Fecha" value={formatDate(row.createdAt)} />
              </DetailSection>
            </>
          ) : (
            <DetailSectionsPager key={row.id} steps={detailSteps} />
          )}
        </div>
      )}
    </ResourceViewShell>
  );
}
