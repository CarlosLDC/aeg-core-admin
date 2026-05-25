"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { ContributorBadge } from "@/components/companies/contributor-badge";
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
import type { ContributorType } from "@/types/company";

const STATUS_LABELS: Record<ModificationRequestStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

function formatAfterValue(
  value: string | number | undefined | null,
  actionType: ClientModificationRequestDetailResponse["actionType"],
): string {
  if (actionType === "DELETE") return "Eliminar";
  if (value == null) return "—";
  const text = String(value).trim();
  return text || "—";
}

function isContributorType(value: unknown): value is ContributorType {
  return value === "ordinario" || value === "especial" || value === "formal";
}

type ClientModificationRequestViewProps = {
  backHref?: string;
};

export function ClientModificationRequestView({
  backHref = "/clients/reviews",
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

  const comparison = useMemo(() => {
    if (!row) return [];
    const current = row.currentClientSnapshot;
    const proposed = row.proposedData;
    return [
      {
        label: "Razón social",
        before: current?.businessName ?? "—",
        after: formatAfterValue(proposed?.businessName, row.actionType),
      },
      {
        label: "RIF",
        before: current?.rif ?? "—",
        after: formatAfterValue(proposed?.rif, row.actionType),
      },
      {
        label: "Tipo de contribuyente",
        before: current?.contributorType ?? "—",
        after: formatAfterValue(proposed?.contributorType, row.actionType),
      },
      {
        label: "Estado",
        before: current?.state ?? "—",
        after: formatAfterValue(proposed?.state, row.actionType),
      },
      {
        label: "Ciudad",
        before: current?.city ?? "—",
        after: formatAfterValue(proposed?.city, row.actionType),
      },
      {
        label: "Dirección",
        before: current?.address ?? "—",
        after: formatAfterValue(proposed?.address, row.actionType),
      },
      {
        label: "Contacto",
        before: current?.contactPersonName ?? "—",
        after: formatAfterValue(proposed?.contactPersonName, row.actionType),
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
              label="Cliente"
              value={formatResourceId(row.clientId)}
              href={clientPath(row.clientId)}
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
          <DetailSection title="Comparación Antes vs Después">
            {comparison.map((field) => {
              const beforeContributor = row.currentClientSnapshot?.contributorType;
              const afterContributor = row.proposedData?.contributorType;
              return (
              <DetailField
                key={field.label}
                label={field.label}
                value={
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted">Antes:</span>{" "}
                      {field.label === "Tipo de contribuyente" &&
                      field.before !== "—" &&
                      isContributorType(beforeContributor) ? (
                        <ContributorBadge
                          type={beforeContributor}
                        />
                      ) : (
                        field.before
                      )}
                    </p>
                    <p>
                      <span className="text-muted">Después:</span>{" "}
                      {field.label === "Tipo de contribuyente" &&
                      field.after !== "—" &&
                      field.after !== "Eliminar" &&
                      isContributorType(afterContributor) ? (
                        <ContributorBadge
                          type={afterContributor}
                        />
                      ) : (
                        field.after
                      )}
                    </p>
                  </div>
                }
              />
              );
            })}
          </DetailSection>
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
                  Esta acción eliminará el vínculo del cliente. Verifica que no
                  existan impresoras asociadas antes de aprobar.
                </p>
              ) : null}
              <DetailSection title="Metadatos" layout="quad">
                <DetailField label="Solicitud" value={formatResourceId(row.id)} mono />
                <DetailField
                  label="Cliente"
                  value={formatResourceId(row.clientId)}
                  href={clientPath(row.clientId)}
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
