"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TechnicalServiceFormDialog } from "@/components/technical-services/technical-service-form-dialog";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useToast } from "@/context/toast-provider";
import { useFieldOperationsCatalog } from "@/hooks/use-field-operations-catalog";
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
import { printerPath, sealPath, technicalServicePath } from "@/lib/resource-routes";
import type { TechnicalServiceResponse } from "@/types/technical-service";

export function TechnicalServiceView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const catalog = useFieldOperationsCatalog();

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
      setService(data);
    } catch (err) {
      setError(getTechnicalServicesErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(values: TechnicalServiceFormValues) {
    if (!service) return;

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
    if (!window.confirm(`¿Eliminar el servicio técnico #${service.id}?`)) {
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
        title={`Servicio técnico #${id ?? ""}`}
        loading={loading}
        error={error}
        actions={
          service ? (
            <ResourceViewActions
              onEdit={() => {
                setFormError(null);
                setEditOpen(true);
              }}
              onDelete={() => void handleDelete()}
              deleting={deleting}
            />
          ) : undefined
        }
      >
        {service && (
          <>
            <DetailCard>
              <DetailField label="ID" value={String(service.id)} mono />
              <DetailField
                label="Impresora"
                value={`#${service.printerId}`}
                href={printerPath(service.printerId)}
              />
              <DetailField
                label="Técnico (ID)"
                value={String(service.technicianId)}
                mono
              />
              <DetailField
                label="Falla reportada"
                value={service.reportedFailure}
                fullWidth
              />
              <DetailField
                label="Precinto violado"
                value={service.sealTampered ? "Sí" : "No"}
              />
              <DetailField label="Costo" value={formatMoney(service.cost)} />
              <DetailField
                label="Inicio"
                value={formatDateTime(service.startAt)}
              />
              <DetailField label="Fin" value={formatDateTime(service.endAt)} />
              <DetailField
                label="Solicitud"
                value={formatDate(service.requestDate)}
              />
              {service.installedSealId != null ? (
                <DetailField
                  label="Precinto instalado"
                  value={`#${service.installedSealId}`}
                  href={sealPath(service.installedSealId)}
                />
              ) : null}
              {service.removedSealId != null ? (
                <DetailField
                  label="Precinto retirado"
                  value={`#${service.removedSealId}`}
                  href={sealPath(service.removedSealId)}
                />
              ) : null}
              <DetailField
                label="Notas"
                value={service.notes || "—"}
                fullWidth
              />
            </DetailCard>
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
          deleting={deleting}
          error={formError}
          catalogLoading={catalog.loading}
          canLoadPrinters={catalog.canLoadPrinters}
          printerOptions={catalog.printerOptions}
          technicianOptions={catalog.technicianOptions}
          sealOptions={catalog.sealOptions}
          serviceCenterOptions={catalog.serviceCenterOptions}
          distributorOptions={catalog.distributorOptions}
          onClose={() => {
            if (!saving && !deleting) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
          onDelete={() => void handleDelete()}
        />
      )}
    </>
  );
}
