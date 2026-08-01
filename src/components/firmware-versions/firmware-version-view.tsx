"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import {
  FirmwareUploadDialog,
  type FirmwareModelOption,
  type FirmwareUploadValues,
} from "@/components/firmware-versions/firmware-upload-dialog";
import {
  DetailField,
  DetailSection,
} from "@/components/resource-view/detail-fields";
import {
  DetailSectionsPager,
  type DetailPagerStep,
} from "@/components/resource-view/detail-sections-pager";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDeleteFirmwareRecord,
  canUpdateFirmwareRecord,
} from "@/lib/api-permissions";
import { forbiddenMessage } from "@/lib/permissions/messages";
import {
  deleteFirmware,
  downloadFirmware,
  fetchFirmwareById,
  getFirmwaresErrorMessage,
  updateFirmware,
} from "@/lib/firmwares-api";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import { firmwareVersionPath, printerModelPath } from "@/lib/resource-routes";
import type { FirmwareResponse } from "@/types/firmware";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"] as const;
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function FirmwareVersionView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canUpdate = user ? canUpdateFirmwareRecord(user.role) : false;
  const canDelete = user ? canDeleteFirmwareRecord(user.role) : false;

  const [firmware, setFirmware] = useState<FirmwareResponse | null>(null);
  const [modelOptions, setModelOptions] = useState<FirmwareModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const modelLabel = useMemo(() => {
    if (!firmware) return "General";
    if (firmware.printerModelId == null) return "General";
    const match = modelOptions.find((m) => m.id === firmware.printerModelId);
    return match?.label ?? `Modelo #${firmware.printerModelId}`;
  }, [firmware, modelOptions]);

  const detailSteps = useMemo((): DetailPagerStep[] => {
    if (!firmware) return [];

    return [
      {
        id: "binary",
        label: "Binario",
        content: (
          <DetailSection title="Binario" layout="quad">
            <DetailField label="Versión" value={firmware.version} mono />
            <DetailField label="Archivo" value={firmware.fileName} mono />
            <DetailField
              label="Tamaño"
              value={formatBytes(firmware.sizeBytes)}
            />
            <DetailField
              label="Modelo fiscal"
              value={modelLabel}
              href={
                firmware.printerModelId != null
                  ? printerModelPath(firmware.printerModelId)
                  : undefined
              }
            />
          </DetailSection>
        ),
      },
      {
        id: "notes",
        label: "Notas",
        content: (
          <DetailSection title="Notas">
            <DetailField
              label="Observaciones"
              value={firmware.notes?.trim() || "—"}
            />
          </DetailSection>
        ),
      },
    ];
  }, [firmware, modelLabel]);

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador de firmware no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchFirmwareById(id);
      setFirmware(data);
    } catch (err) {
      setError(getFirmwaresErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    fetchPrinterModels()
      .then((models) => {
        if (cancelled) return;
        setModelOptions(
          [...models]
            .sort((a, b) => {
              const brandCmp = a.brand.localeCompare(b.brand, "es");
              if (brandCmp !== 0) return brandCmp;
              return a.modelCode.localeCompare(b.modelCode, "es");
            })
            .map((m) => ({
              id: m.id,
              label: `${m.brand} ${m.modelCode}`.trim(),
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setModelOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(values: FirmwareUploadValues) {
    if (!firmware) return;
    if (!canUpdate) {
      setFormError(forbiddenMessage("update", "firmwares"));
      return;
    }

    const printerModelId = values.printerModelId
      ? Number(values.printerModelId)
      : null;

    setSaving(true);
    setFormError(null);
    try {
      const updated = await updateFirmware(firmware.id, {
        version: values.version,
        printerModelId:
          printerModelId != null && Number.isFinite(printerModelId)
            ? printerModelId
            : null,
        notes: values.notes || null,
      });
      setFirmware(updated);
      toast.success(`Firmware ${updated.version} actualizado.`, {
        href: firmwareVersionPath(updated.id),
      });
      setEditOpen(false);
    } catch (err) {
      const message = getFirmwaresErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    if (!firmware) return;
    setDownloading(true);
    try {
      await downloadFirmware(firmware.id, firmware.fileName);
    } catch (err) {
      toast.error(getFirmwaresErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    if (!firmware) return;
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "firmwares"));
      return;
    }
    const label = firmware.version;
    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar el firmware ${label} (${firmware.fileName})? El archivo remoto también se borrará.`,
        destructive: true,
      }))
    ) {
      return;
    }

    setDeleting(true);
    try {
      await deleteFirmware(firmware.id);
      toast.success(`Firmware ${label} eliminado.`);
      router.push("/firmware-versions");
    } catch (err) {
      toast.error(getFirmwaresErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const title = firmware ? `Firmware ${firmware.version}` : "Versión de firmware";

  return (
    <>
      <ResourceViewShell
        backHref="/firmware-versions"
        backLabel="Volver a firmwares"
        title={title}
        subtitle={firmware ? modelLabel : undefined}
        loading={loading}
        error={error}
        actions={
          firmware ? (
            <ResourceViewActions
              leadingActions={
                <button
                  type="button"
                  onClick={() => void handleDownload()}
                  disabled={downloading || deleting}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
                >
                  {downloading ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="size-4" aria-hidden />
                  )}
                  Descargar
                </button>
              }
              onEdit={
                canUpdate
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
        {firmware ? (
          <DetailSectionsPager key={firmware.id} steps={detailSteps} />
        ) : null}
      </ResourceViewShell>

      {firmware && editOpen ? (
        <FirmwareUploadDialog
          mode="edit"
          open={editOpen}
          saving={saving}
          error={formError}
          modelOptions={modelOptions}
          firmware={firmware}
          onClose={() => {
            if (!saving) setEditOpen(false);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}
    </>
  );
}
