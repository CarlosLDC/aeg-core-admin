"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnnualInspectionFormDialog } from "@/components/annual-inspections/annual-inspection-form-dialog";
import { DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useFieldOperationsCatalog } from "@/hooks/use-field-operations-catalog";
import {
  canDeleteAnnualInspectionRecord,
  canModifyAnnualInspectionRecord,
} from "@/lib/api-permissions";
import { assertAnnualInspectionInScope } from "@/lib/permissions/scope-access";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  annualInspectionPrinterOptions,
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
  formatMqttSetDateRevOAt,
  hasAnnualInspectionMqttAudit,
} from "@/lib/annual-inspection-mqtt-display";
import {
  hasAnnualInspectionQrProof,
  truncateQrCodigo,
} from "@/lib/annual-inspection-qr-display";
import {
  annualInspectionChecklistRows,
  hasAnnualInspectionChecklistDisplay,
} from "@/lib/annual-inspection-checklist-display";
import { catalogOptionLabel } from "@/lib/record-labels";
import {
  annualInspectionPath,
  printerPath,
  userPath,
} from "@/lib/resource-routes";
import type { AnnualInspectionResponse } from "@/types/annual-inspection";

export function AnnualInspectionView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const catalog = useFieldOperationsCatalog();
  const canModify = user ? canModifyAnnualInspectionRecord(user.role) : false;
  const canDelete = user ? canDeleteAnnualInspectionRecord(user.role) : false;

  const [inspection, setInspection] = useState<AnnualInspectionResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const inspectionPrinterOptions = useMemo(
    () =>
      annualInspectionPrinterOptions(
        catalog.scopedPrinters,
        inspection?.printerId ?? null,
      ),
    [catalog.scopedPrinters, inspection?.printerId],
  );

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
      if (
        user &&
        !assertAnnualInspectionInScope(
          data,
          catalog.scopedPrinterIds,
          catalog.scopedTechnicianUserIds,
          user.role,
        )
      ) {
        setError("No tienes acceso a este recurso.");
        setInspection(null);
        return;
      }
      setInspection(data);
    } catch (err) {
      setError(getAnnualInspectionsErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, user, catalog.scopedPrinterIds, catalog.scopedTechnicianUserIds]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(values: AnnualInspectionFormValues) {
    if (!inspection) return;
    if (!canModify) {
      setFormError(forbiddenMessage("update", "annualInspections"));
      return;
    }

    const bodyOrError = toAnnualInspectionRequest(
      values,
      catalog.scopedPrinters,
    );
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
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "annualInspections"));
      return;
    }
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar la inspección ${inspection.id}?`, destructive: true }))) {
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
        title="Inspección anual"
        loading={loading}
        error={error}
        actions={
          inspection ? (
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
        {inspection && (
          <>
            <DetailSection title="Inspección anual" layout="quad">
              <DetailField
                label="Impresora"
                value={catalogOptionLabel(
                  catalog.printerOptions,
                  inspection.printerId,
                  "—",
                )}
                href={printerPath(inspection.printerId)}
              />
              <DetailField
                label="Inspector"
                value={catalogOptionLabel(
                  catalog.inspectorUserOptions,
                  inspection.userId,
                  "—",
                )}
                href={userPath(inspection.userId)}
              />
              <DetailField
                label="Fecha inspección"
                value={formatDate(inspection.inspectionDate)}
              />
              <DetailField
                label="Notas"
                value={inspection.notes || "—"}
              />
            </DetailSection>
            {hasAnnualInspectionChecklistDisplay(inspection) ? (
              <DetailSection title="Checklist de inspección" layout="quad">
                {annualInspectionChecklistRows(inspection).map((row) => (
                  <DetailField key={row.label} label={row.label} value={row.value} />
                ))}
              </DetailSection>
            ) : (
              <DetailSection title="Precinto">
                <DetailField
                  label="Precinto violado"
                  value={inspection.sealTampered ? "Sí" : "No"}
                />
              </DetailSection>
            )}
            {hasAnnualInspectionMqttAudit(inspection) ? (
              <DetailSection title="Auditoría Remoto (SetDateRevO)" layout="quad">
                <DetailField
                  label="Registro impresora"
                  value={inspection.mqttRegistroImpresora ?? "—"}
                  mono
                />
                <DetailField
                  label="SetDateRevO"
                  value={formatMqttSetDateRevOAt(inspection.mqttSetDateRevOAt)}
                  mono
                />
                <DetailField
                  label="Nº factura de prueba"
                  value={
                    inspection.mqttNumeroFacturaPrueba != null
                      ? String(inspection.mqttNumeroFacturaPrueba)
                      : "—"
                  }
                  mono
                />
              </DetailSection>
            ) : null}
            {hasAnnualInspectionQrProof(inspection) ? (
              <DetailSection title="Comprobante QR" layout="quad">
                <DetailField
                  label="Registro impresora"
                  value={inspection.mqttQrRegistro ?? "—"}
                  mono
                />
                <DetailField
                  label="MAC"
                  value={inspection.mqttQrMac ?? "—"}
                  mono
                />
                <DetailField
                  label="Fecha (firmware)"
                  value={inspection.mqttQrFecha ?? "—"}
                  mono
                />
                <DetailField
                  label="Código QR"
                  value={truncateQrCodigo(inspection.mqttQrCodigo)}
                  mono
                />
              </DetailSection>
            ) : null}
          </>
        )}
      </ResourceViewShell>

      {inspection && editOpen && (
        <AnnualInspectionFormDialog
          mode="edit"
          row={inspection}
          open={editOpen}
          saving={saving}
          error={formError}
          catalogLoading={catalog.loading}
          canLoadPrinters={catalog.canLoadPrinters}
          printerOptions={inspectionPrinterOptions}
          technicianUserOptions={catalog.inspectorUserOptions}
          currentUserRole={catalog.role}
          currentUserId={catalog.currentUserId}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
