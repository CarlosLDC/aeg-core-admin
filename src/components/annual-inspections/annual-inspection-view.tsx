"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnnualInspectionFormDialog } from "@/components/annual-inspections/annual-inspection-form-dialog";
import { DetailCard, DetailField } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useToast } from "@/context/toast-provider";
import { useFieldOperationsCatalog } from "@/hooks/use-field-operations-catalog";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  toAnnualInspectionRequest,
  type AnnualInspectionFormValues,
} from "@/lib/annual-inspection-form";
import {
  deleteAnnualInspection,
  fetchAnnualInspectionById,
  getAnnualInspectionsErrorMessage,
  updateAnnualInspection,
} from "@/lib/annual-inspections-api";
import { formatDate } from "@/lib/datetime-form";
import {
  annualInspectionPath,
  employeePath,
  printerPath,
} from "@/lib/resource-routes";
import type { AnnualInspectionResponse } from "@/types/annual-inspection";

export function AnnualInspectionView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const catalog = useFieldOperationsCatalog();

  const [inspection, setInspection] = useState<AnnualInspectionResponse | null>(
    null,
  );
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
      const data = await fetchAnnualInspectionById(id);
      setInspection(data);
    } catch (err) {
      setError(getAnnualInspectionsErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(values: AnnualInspectionFormValues) {
    if (!inspection) return;

    const bodyOrError = toAnnualInspectionRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const updated = await updateAnnualInspection(inspection.id, bodyOrError);
      setInspection(updated);
      toast.success("Inspección actualizada.", {
        href: annualInspectionPath(updated.id),
      });
      setEditOpen(false);
    } catch (err) {
      const message = getAnnualInspectionsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!inspection) return;
    if (!window.confirm(`¿Eliminar la inspección #${inspection.id}?`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteAnnualInspection(inspection.id);
      toast.success("Inspección eliminada.");
      router.push("/annual-inspections");
    } catch (err) {
      toast.error(getAnnualInspectionsErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ResourceViewShell
        backHref="/annual-inspections"
        backLabel="Volver a inspecciones"
        title={`Inspección anual #${id ?? ""}`}
        loading={loading}
        error={error}
        actions={
          inspection ? (
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
        {inspection && (
          <>
            <DetailCard>
              <DetailField label="ID" value={String(inspection.id)} mono />
              <DetailField
                label="Impresora"
                value={`#${inspection.printerId}`}
                href={printerPath(inspection.printerId)}
              />
              <DetailField
                label="Empleado"
                value={`#${inspection.employeeId}`}
                href={employeePath(inspection.employeeId)}
              />
              <DetailField
                label="Fecha inspección"
                value={formatDate(inspection.inspectionDate)}
              />
              <DetailField
                label="Precinto violado"
                value={inspection.sealTampered ? "Sí" : "No"}
              />
              <DetailField
                label="Notas"
                value={inspection.notes || "—"}
                fullWidth
              />
              <DetailField
                label="Registrada"
                value={formatDate(inspection.createdAt)}
              />
            </DetailCard>
            {inspection.photoUrls.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-sm font-medium text-card-foreground">
                  Fotos ({inspection.photoUrls.length})
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {inspection.photoUrls.map((url, index) => (
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

      {inspection && editOpen && (
        <AnnualInspectionFormDialog
          mode="edit"
          row={inspection}
          open={editOpen}
          saving={saving}
          deleting={deleting}
          error={formError}
          catalogLoading={catalog.loading}
          canLoadPrinters={catalog.canLoadPrinters}
          printerOptions={catalog.printerOptions}
          employeeOptions={catalog.employeeOptions}
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
