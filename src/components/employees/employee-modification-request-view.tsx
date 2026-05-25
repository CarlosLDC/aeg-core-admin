"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { branchPath, employeePath } from "@/lib/resource-routes";
import {
  approveEmployeeModificationRequest,
  fetchEmployeeModificationRequestById,
  getEmployeeModificationRequestsErrorMessage,
  rejectEmployeeModificationRequest,
} from "@/lib/employee-modification-requests-api";
import { formatDate } from "@/lib/datetime-form";
import { formatResourceId } from "@/lib/format-resource-id";
import { formatOperationalRole } from "@/lib/employee-roles";
import type {
  ModificationRequestDetailResponse,
  ModificationRequestStatus,
} from "@/types/employee-modification-request";

const STATUS_LABELS: Record<ModificationRequestStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

function formatAfterValue(
  value: string | number | undefined | null,
  actionType: ModificationRequestDetailResponse["actionType"],
): string {
  if (actionType === "DELETE") return "Eliminar";
  if (value == null) return "—";
  const text = String(value).trim();
  return text || "—";
}

type EmployeeModificationRequestViewProps = {
  backHref?: string;
};

export function EmployeeModificationRequestView({
  backHref = "/employees/reviews",
}: EmployeeModificationRequestViewProps) {
  const id = useResourceId();
  const toast = useToast();
  const confirm = useConfirm();
  const [row, setRow] = useState<ModificationRequestDetailResponse | null>(null);
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
      setRow(await fetchEmployeeModificationRequestById(id));
    } catch (err) {
      setError(getEmployeeModificationRequestsErrorMessage(err));
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
    if (!(await confirm({ title: "Confirmar", message: "¿Aprobar esta solicitud?", destructive: false }))) {
      return;
    }
    setSaving(true);
    try {
      const updated = await approveEmployeeModificationRequest(row.id);
      setRow(updated);
      toast.success("Solicitud aprobada.");
    } catch (err) {
      toast.error(getEmployeeModificationRequestsErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!row) return;
    if (!(await confirm({ title: "Confirmar", message: "¿Rechazar esta solicitud?", destructive: true }))) {
      return;
    }
    setSaving(true);
    try {
      const updated = await rejectEmployeeModificationRequest(row.id);
      setRow(updated);
      toast.success("Solicitud rechazada.");
    } catch (err) {
      toast.error(getEmployeeModificationRequestsErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const comparison = useMemo(() => {
    if (!row) return [];
    const current = row.currentEmployeeSnapshot;
    const proposed = row.proposedData;
    return [
      {
        label: "Nombre",
        before: current?.name ?? "—",
        after: formatAfterValue(proposed?.name, row.actionType),
      },
      {
        label: "Cédula",
        before: current?.nationalId ?? "—",
        after: formatAfterValue(proposed?.nationalId, row.actionType),
      },
      {
        label: "Teléfono",
        before: current?.phone ?? "—",
        after: formatAfterValue(proposed?.phone, row.actionType),
      },
      {
        label: "Correo",
        before: current?.email ?? "—",
        after: formatAfterValue(proposed?.email, row.actionType),
      },
      {
        label: "Rol",
        before: formatOperationalRole({
          isTechnician: current?.isTechnician,
          isDistributorPerson: current?.isDistributorPerson,
          type: current?.type,
        }),
        after:
          row.actionType === "DELETE"
            ? "Eliminar"
            : formatOperationalRole({
                isTechnician: proposed?.isTechnician,
                isDistributorPerson: proposed?.isDistributorPerson,
                type: proposed?.type,
              }),
      },
      {
        label: "Tipo (empleado)",
        before: current?.type ?? "—",
        after: formatAfterValue(proposed?.type, row.actionType),
      },
      {
        label: "Sucursal",
        before: current?.branchId != null ? String(current.branchId) : "—",
        after:
          proposed?.branchId != null
            ? String(proposed.branchId)
            : row.actionType === "DELETE"
              ? "Eliminar"
              : "—",
      },
    ];
  }, [row]);

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
              label="Empleado"
              value={formatResourceId(row.employeeId)}
              href={employeePath(row.employeeId)}
              mono
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
        content: (
          <div className="space-y-4">
            {!row.proposedData && (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
                Esta solicitud no guardó los datos propuestos (registro antiguo o
                error del servidor). Recházala y vuelve a enviarla tras actualizar
                el backend.
              </p>
            )}
            <DetailSection title="Comparación Antes vs Después">
              {comparison.map((field) => (
                <DetailField
                  key={field.label}
                  label={field.label}
                  value={
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-muted">Antes:</span> {field.before}
                      </p>
                      <p>
                        <span className="text-muted">Después:</span> {field.after}
                      </p>
                    </div>
                  }
                  href={
                    field.label === "Sucursal" && row.currentEmployeeSnapshot?.branchId
                      ? branchPath(row.currentEmployeeSnapshot.branchId)
                      : undefined
                  }
                />
              ))}
            </DetailSection>
          </div>
        ),
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
                  Esta acción eliminará el empleado y su rol operativo asociado.
                  Verifica que no existan dependencias activas antes de aprobar.
                </p>
              ) : null}
              <DetailSection title="Metadatos" layout="quad">
                <DetailField label="Solicitud" value={formatResourceId(row.id)} mono />
                <DetailField
                  label="Empleado"
                  value={formatResourceId(row.employeeId)}
                  href={employeePath(row.employeeId)}
                  mono
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
