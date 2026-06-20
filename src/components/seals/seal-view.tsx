"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SealFormDialog } from "@/components/seals/seal-form-dialog";
import { DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import { useFieldOperationsCatalog } from "@/hooks/use-field-operations-catalog";
import {
  canDeleteSealRecord,
  canModifySealRecord,
} from "@/lib/api-permissions";
import { assertSealInScope } from "@/lib/permissions/scope-access";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { formatDate } from "@/lib/datetime-form";
import {
  SEAL_COLOR_LABELS,
  SEAL_STATUS_LABELS,
  toSealRequest,
  type SealFormValues,
} from "@/lib/seal-form";
import {
  deleteSeal,
  fetchSealById,
  getSealsErrorMessage,
  updateSeal,
} from "@/lib/seals-api";
import { printerPath, sealPath } from "@/lib/resource-routes";
import type { PrinterSelectOption } from "@/components/seals/seal-form-dialog";
import type { SealResponse } from "@/types/seal";

function toPrinterSelectOptions(
  options: { value: string; label: string }[],
): PrinterSelectOption[] {
  return options.map((option) => ({
    id: Number(option.value),
    label: option.label,
  }));
}

export function SealView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const catalog = useFieldOperationsCatalog();
  const canModify = user ? canModifySealRecord(user.role) : false;
  const canDelete = user ? canDeleteSealRecord(user.role) : false;

  const [seal, setSeal] = useState<SealResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const printerOptions = useMemo(
    () => toPrinterSelectOptions(catalog.printerOptions),
    [catalog.printerOptions],
  );

  const printerLabelById = useMemo(
    () => new Map(printerOptions.map((p) => [p.id, p.label])),
    [printerOptions],
  );

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de precinto no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchSealById(id);
      if (
        user &&
        !assertSealInScope(data, catalog.scopedPrinterIds, user.role)
      ) {
        setError("No tienes acceso a este recurso.");
        setSeal(null);
        return;
      }
      setSeal(data);
    } catch (err) {
      setError(getSealsErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id, user, catalog.scopedPrinterIds]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(values: SealFormValues) {
    if (!seal) return;
    if (!canModify) {
      setFormError(forbiddenMessage("update", "seals"));
      return;
    }

    const bodyOrError = toSealRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const updated = await updateSeal(seal.id, bodyOrError);
      setSeal(updated);
      toast.success("Precinto actualizado.", { href: sealPath(updated.id) });
      setEditOpen(false);
    } catch (err) {
      const message = getSealsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!seal) return;
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "seals"));
      return;
    }
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar el precinto con serial ${seal.serial}?`, destructive: true }))) {
      return;
    }

    setDeleting(true);
    try {
      await deleteSeal(seal.id);
      toast.success("Precinto eliminado.");
      router.push("/seals");
    } catch (err) {
      toast.error(getSealsErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const printerLabel =
    seal?.printerId != null
      ? printerLabelById.get(seal.printerId) ?? "—"
      : "Sin asignar";

  return (
    <>
      <ResourceViewShell
        backHref="/seals"
        backLabel="Volver a precintos"
        title={seal?.serial ?? "Precinto"}
        loading={loading}
        error={error}
        actions={
          seal ? (
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
        {seal && (
          <DetailSection title="Precinto" layout="quad">
            <DetailField label="ID" value={String(seal.id)} mono />
            <DetailField label="Serial" value={seal.serial} mono />
            <DetailField
              label="Color"
              value={SEAL_COLOR_LABELS[seal.color]}
            />
            <DetailField
              label="Estatus"
              value={SEAL_STATUS_LABELS[seal.status]}
            />
            {seal.printerId != null ? (
              <DetailField
                label="Impresora"
                value={printerLabel}
                href={printerPath(seal.printerId)}
              />
            ) : (
              <DetailField label="Impresora" value="Sin asignar" />
            )}
            <DetailField
              label="Instalación"
              value={formatDate(seal.installationDate)}
            />
            <DetailField label="Retiro" value={formatDate(seal.removalDate)} />
            <DetailField
              label="Registrado"
              value={formatDate(seal.createdAt)}
            />
          </DetailSection>
        )}
      </ResourceViewShell>

      {seal && editOpen && (
        <SealFormDialog
          mode="edit"
          seal={seal}
          open={editOpen}
          saving={saving}
          error={formError}
          printerOptions={printerOptions}
          printersLoading={catalog.loading}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
