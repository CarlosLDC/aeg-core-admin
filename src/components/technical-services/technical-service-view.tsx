"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TechnicalServiceFormDialog } from "@/components/technical-services/technical-service-form-dialog";
import { DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useFieldOperationsCatalog } from "@/hooks/use-field-operations-catalog";
import {
  canDeleteTechnicalServiceRecord,
  canModifyTechnicalServiceRecord,
} from "@/lib/api-permissions";
import { assertTechnicalServiceInScope } from "@/lib/permissions/scope-access";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { useResourceId } from "@/hooks/use-resource-id";
import { formatDate, formatDateTime, formatMoney } from "@/lib/datetime-form";
import {
  toTechnicalServiceRequest,
  type TechnicalServiceFormValues,
} from "@/lib/technical-service-form";
import {
  deleteTechnicalService,
  fetchTechnicalServiceById,
  getTechnicalServicesErrorMessage,
  updateTechnicalService,
} from "@/lib/technical-services-api";
import { catalogOptionLabel } from "@/lib/record-labels";
import { printerPath, sealPath, technicalServicePath } from "@/lib/resource-routes";
import type { TechnicalServiceResponse } from "@/types/technical-service";

export function TechnicalServiceView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const catalog = useFieldOperationsCatalog();
  const canModify = user ? canModifyTechnicalServiceRecord(user.role) : false;
  const canDelete = user ? canDeleteTechnicalServiceRecord(user.role) : false;

  const [service, setService] = useState<TechnicalServiceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchTechnicalServiceById(id);
      if (
        user &&
        !assertTechnicalServiceInScope(
          data,
          catalog.scopedPrinterIds,
          user.role,
          catalog.distributorId,
        )
      ) {
        setError("No tienes acceso a este recurso.");
        setService(null);
        return;
      }
      setService(data);
    } catch (err) {
      setError(getTechnicalServicesErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, user, catalog.scopedPrinterIds, catalog.distributorId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(values: TechnicalServiceFormValues) {
    if (!service) return;
    if (!canModify) {
      setFormError(forbiddenMessage("update", "technicalServices"));
      return;
    }

    const bodyOrError = toTechnicalServiceRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const updated = await updateTechnicalService(service.id, bodyOrError);
      setService(updated);
      toast.success("Servicio técnico actualizado.", {
        href: technicalServicePath(updated.id),
      });
      setEditOpen(false);
    } catch (err) {
      const message = getTechnicalServicesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!service) return;
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "technicalServices"));
      return;
    }
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar el servicio técnico ${service.id}?`, destructive: true }))) {
      return;
    }

    setDeleting(true);
    try {
      await deleteTechnicalService(service.id);
      toast.success("Servicio eliminado.");
      router.push("/technical-services");
    } catch (err) {
      toast.error(getTechnicalServicesErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ResourceViewShell
        backHref="/technical-services"
        backLabel="Volver a servicios técnicos"
        title="Servicio técnico"
        loading={loading}
        error={error}
        actions={
          service ? (
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
        {service && (
          <>
            <div className="space-y-4">
              <DetailSection title="Servicio técnico" layout="quad">
                <DetailField label="ID" value={String(service.id)} mono />
                <DetailField
                  label="Impresora"
                  value={catalogOptionLabel(catalog.printerOptions, service.printerId, "—")}
                  href={printerPath(service.printerId)}
                />
                <DetailField
                  label="Técnico"
                  value={catalogOptionLabel(
                    catalog.technicianOptions,
                    service.technicianId,
                    "—",
                  )}
                />
                <DetailField
                  label="Centro de servicio"
                  value={catalogOptionLabel(
                    catalog.serviceCenterOptions,
                    service.serviceCenterId,
                    "Sin asignar",
                  )}
                />
                <DetailField
                  label="Distribuidor"
                  value={catalogOptionLabel(
                    catalog.distributorOptions,
                    service.distributorId,
                    "Sin asignar",
                  )}
                />
                <DetailField
                  label="Falla reportada"
                  value={service.reportedFailure}
                />
                <DetailField
                  label="Precinto violado"
                  value={service.sealTampered ? "Sí" : "No"}
                />
                <DetailField label="Costo" value={formatMoney(service.cost)} />
                <DetailField
                  label="Solicitud"
                  value={formatDate(service.requestDate)}
                />
                <DetailField
                  label="Inicio"
                  value={formatDateTime(service.startAt)}
                />
                <DetailField label="Fin" value={formatDateTime(service.endAt)} />
                <DetailField
                  label="Registrado"
                  value={formatDate(service.createdAt)}
                />
              </DetailSection>
              <DetailSection title="Reportes y cierre" layout="quad">
                <DetailField
                  label="Z inicial"
                  value={String(service.initialZReport)}
                  mono
                />
                <DetailField
                  label="Fecha Z inicial"
                  value={formatDateTime(service.initialZDate)}
                />
                <DetailField
                  label="Z final"
                  value={String(service.finalZReport)}
                  mono
                />
                <DetailField
                  label="Fecha Z final"
                  value={formatDateTime(service.finalZDate)}
                />
                <DetailField
                  label="Precinto instalado"
                  value={catalogOptionLabel(
                    catalog.sealOptions,
                    service.installedSealId,
                    "—",
                  )}
                  href={
                    service.installedSealId != null
                      ? sealPath(service.installedSealId)
                      : undefined
                  }
                />
                <DetailField
                  label="Precinto retirado"
                  value={catalogOptionLabel(
                    catalog.sealOptions,
                    service.removedSealId,
                    "—",
                  )}
                  href={
                    service.removedSealId != null
                      ? sealPath(service.removedSealId)
                      : undefined
                  }
                />
                <DetailField
                  label="Notas"
                  value={service.notes || "—"}
                />
              </DetailSection>
            </div>
            {service.photoUrls.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-sm font-medium text-card-foreground">
                  Fotos ({service.photoUrls.length})
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {service.photoUrls.map((url, index) => (
                    <li key={url}>
                      <a
                        href={`/api/uploads/documents?url=${encodeURIComponent(url)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline-offset-2 hover:underline"
                      >
                        Foto {index + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </ResourceViewShell>

      {service && editOpen && (
        <TechnicalServiceFormDialog
          mode="edit"
          row={service}
          open={editOpen}
          saving={saving}
          error={formError}
          catalogLoading={catalog.loading}
          canLoadPrinters={catalog.canLoadPrinters}
          printerOptions={catalog.printerOptions}
          technicianOptions={catalog.technicianOptions}
          sealOptions={catalog.sealOptions}
          serviceCenterOptions={catalog.serviceCenterOptions}
          distributorOptions={catalog.distributorOptions}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
