"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PrinterModelFormDialog } from "@/components/printer-models/printer-model-form-dialog";
import { DetailField, DetailSection } from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDeletePrinterModelRecord,
  canManagePrinterModels,
} from "@/lib/api-permissions";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { formatDate, formatMoney } from "@/lib/datetime-form";
import {
  toPrinterModelRequest,
  type PrinterModelFormValues,
} from "@/lib/printer-model-form";
import {
  deletePrinterModel,
  fetchPrinterModelById,
  getPrinterModelsErrorMessage,
  updatePrinterModel,
} from "@/lib/printer-models-api";
import { printerModelPath } from "@/lib/resource-routes";
import type { PrinterModelResponse } from "@/types/printer-model";

export function PrinterModelView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canModify = user ? canManagePrinterModels(user.role) : false;
  const canDelete = user ? canDeletePrinterModelRecord(user.role) : false;

  const [model, setModel] = useState<PrinterModelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de modelo no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchPrinterModelById(id);
      setModel(data);
    } catch (err) {
      setError(getPrinterModelsErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(values: PrinterModelFormValues) {
    if (!model) return;
    if (!canModify) {
      setFormError(forbiddenMessage("update", "printerModels"));
      return;
    }

    const bodyOrError = toPrinterModelRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    setSaving(true);
    setFormError(null);
    const label = bodyOrError.modelCode;

    try {
      const updated = await updatePrinterModel(model.id, bodyOrError);
      setModel(updated);
      toast.success(`Modelo "${label}" actualizado.`, {
        href: printerModelPath(updated.id),
      });
      setEditOpen(false);
    } catch (err) {
      const message = getPrinterModelsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!model) return;
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "printerModels"));
      return;
    }
    const label = model.modelCode;
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar el modelo "${label}"? Las impresoras vinculadas pueden verse afectadas.`, destructive: true }))) {
      return;
    }

    setDeleting(true);
    try {
      await deletePrinterModel(model.id);
      toast.success(`Modelo "${label}" eliminado.`);
      router.push("/printer-models");
    } catch (err) {
      toast.error(getPrinterModelsErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const title = model ? model.modelCode : "Modelo fiscal";

  return (
    <>
      <ResourceViewShell
        backHref="/printer-models"
        backLabel="Volver a modelos"
        title={title}
        subtitle={model?.providencia}
        loading={loading}
        error={error}
        actions={
          model ? (
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
        {model && (
          <DetailSection title="Modelo fiscal" layout="quad">
            <DetailField label="Modelo" value={model.modelCode} mono />
            <DetailField label="Precio" value={formatMoney(model.price)} />
            <DetailField
              label="Providencia"
              value={model.providencia || "—"}
            />
            <DetailField
              label="Fecha de homologación"
              value={formatDate(model.approvalDate)}
            />
          </DetailSection>
        )}
      </ResourceViewShell>

      {model && editOpen && (
        <PrinterModelFormDialog
          mode="edit"
          model={model}
          open={editOpen}
          saving={saving}
          error={formError}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
