"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";
import { DetailCard, DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import { formatDate } from "@/lib/datetime-form";
import { formatResourceId } from "@/lib/format-resource-id";
import { printerPath } from "@/lib/resource-routes";
import {
  approveSoftwareModificationRequest,
  fetchSoftwareModificationRequestById,
  getSoftwareModificationRequestsErrorMessage,
  rejectSoftwareModificationRequest,
} from "@/lib/software-modification-requests-api";
import type { ModificationRequestStatus } from "@/types/client-modification-request";
import type { SoftwareModificationRequestDetailResponse } from "@/types/software-modification-request";
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

type SoftwareModificationRequestViewProps = {
  backHref?: string;
};

export function SoftwareModificationRequestView({
  backHref = "/reviews",
}: SoftwareModificationRequestViewProps) {
  const id = useResourceId();
  const toast = useToast();
  const confirm = useConfirm();
  const [row, setRow] = useState<SoftwareModificationRequestDetailResponse | null>(null);
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
      setRow(await fetchSoftwareModificationRequestById(id));
    } catch (err) {
      setError(getSoftwareModificationRequestsErrorMessage(err));
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
    const ok = await confirm({
      title: "Aprobar software",
      message: `¿Aprobar el software "${row.name} v${row.version}" e incorporarlo a la base de datos? Se asignará automáticamente a la impresora ${row.printerFiscalSerial}.`,
      destructive: false,
    });
    if (!ok) return;

    setSaving(true);
    try {
      const updated = await approveSoftwareModificationRequest(row.id);
      setRow(updated);
      toast.success(
        `Software aprobado e incorporado con éxito. Asignado a la impresora ${row.printerFiscalSerial}.`,
      );
    } catch (err) {
      toast.error(getSoftwareModificationRequestsErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!row) return;
    const ok = await confirm({
      title: "Rechazar solicitud",
      message: `¿Rechazar la creación del software "${row.name} v${row.version}"?`,
      destructive: true,
    });
    if (!ok) return;

    setSaving(true);
    try {
      const updated = await rejectSoftwareModificationRequest(row.id);
      setRow(updated);
      toast.success("Solicitud de software rechazada.");
    } catch (err) {
      toast.error(getSoftwareModificationRequestsErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResourceViewShell
      backHref={backHref}
      backLabel="Volver a solicitudes"
      title={row ? `${row.name} v${row.version}` : "Solicitud de software"}
      subtitle={
        row
          ? `Solicitud #${formatResourceId(row.id)} — Impresora ${row.printerFiscalSerial}`
          : undefined
      }
      loading={loading}
      error={error}
      actions={
        canReview ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleReject()}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 text-sm font-medium text-rose-700 hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
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
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-sm font-medium text-white shadow hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Aprobar y asignar
            </button>
          </div>
        ) : undefined
      }
    >
      {row && (
        <div className="space-y-6">
          <DetailSection title="Datos del software propuesto">
            <DetailCard>
              <DetailField label="Nombre" value={row.name} />
              <DetailField label="Versión" value={row.version} />
              <DetailField
                label="Tipo de desarrollo"
                value={row.external ? "Externo (Terceros)" : "Interno"}
              />
              <DetailField
                label="Desarrollador"
                value={row.developerName || "—"}
              />
              <DetailField
                label="RIF Desarrollador"
                value={row.developerRif || "—"}
                mono
              />
              <DetailField
                label="Lenguajes de programación"
                value={
                  row.programmingLanguages.length > 0
                    ? row.programmingLanguages.join(", ")
                    : "—"
                }
              />
              <DetailField
                label="Sistemas operativos"
                value={
                  row.operatingSystems.length > 0
                    ? row.operatingSystems.join(", ")
                    : "—"
                }
              />
              <DetailField
                label="Distribuidores autorizados"
                value={
                  row.distributors.length > 0
                    ? row.distributors
                        .map((d) => `${d.businessName} (${d.rif})`)
                        .join(", ")
                    : "—"
                }
                fullWidth
              />
            </DetailCard>
          </DetailSection>

          <DetailSection title="Impresora a la que se asignará">
            <DetailCard>
              <DetailField
                label="Serial fiscal"
                value={row.printerFiscalSerial}
                mono
                href={printerPath(row.printerId)}
              />
              <DetailField label="Modelo fiscal" value={row.printerModelCode} />
              <DetailField
                label="Distribuidora asignada"
                value={row.distributorName}
              />
            </DetailCard>
          </DetailSection>

          <DetailSection title="Detalles de la solicitud">
            <DetailCard>
              <DetailField label="ID" value={formatResourceId(row.id)} mono />
              <DetailField
                label="Estado"
                value={
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      STATUS_STYLES[row.status],
                    )}
                  >
                    {STATUS_LABELS[row.status]}
                  </span>
                }
              />
              <DetailField label="Solicitado por" value={row.requestedByName} />
              <DetailField
                label="Fecha de solicitud"
                value={formatDate(row.createdAt)}
              />
            </DetailCard>
          </DetailSection>
        </div>
      )}
    </ResourceViewShell>
  );
}
