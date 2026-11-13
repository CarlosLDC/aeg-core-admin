"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InventoryBoxFormDialog } from "@/components/inventory-boxes/inventory-box-form-dialog";
import {
  DetailField,
  DetailSection,
} from "@/components/resource-view/detail-fields";
import { ResourceViewActions } from "@/components/resource-view/resource-view-actions";
import { ResourceViewShell } from "@/components/resource-view/resource-view-shell";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { EmptyState } from "@/components/ui/empty-state";
import { TableScroll } from "@/components/ui/table-scroll";
import { useAuth } from "@/context/auth-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { useResourceId } from "@/hooks/use-resource-id";
import {
  canDeleteInventoryBoxRecord,
  canModifyInventoryBoxRecord,
} from "@/lib/api-permissions";
import { formatDate } from "@/lib/datetime-form";
import {
  formatInventoryBoxLabel,
  toInventoryBoxRequest,
  type InventoryBoxFormValues,
} from "@/lib/inventory-box-form";
import {
  deleteInventoryBox,
  fetchInventoryBoxById,
  getInventoryBoxesErrorMessage,
  updateInventoryBox,
} from "@/lib/inventory-boxes-api";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { PRINTER_STATUS_LABELS } from "@/lib/printer-form";
import { normalizePrinterStatus } from "@/lib/printer-status";
import { fetchPrinters } from "@/lib/printers-api";
import { inventoryBoxesListPath, printerPath } from "@/lib/resource-routes";
import type { InventoryBoxResponse } from "@/types/inventory-box";
import type { PrinterResponse } from "@/types/printer";

export function InventoryBoxView() {
  const id = useResourceId();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canModify = user ? canModifyInventoryBoxRecord(user.role) : false;
  const canDelete = user ? canDeleteInventoryBoxRecord(user.role) : false;

  const [box, setBox] = useState<InventoryBoxResponse | null>(null);
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (id == null) {
      setError("Identificador no válido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [boxData, printersData] = await Promise.all([
        fetchInventoryBoxById(id),
        fetchPrinters().catch(() => []),
      ]);
      setBox(boxData);
      setPrinters(printersData);
    } catch (err) {
      setError(getInventoryBoxesErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const boxPrinters = useMemo(() => {
    if (!box) return [];
    return printers
      .filter((printer) => printer.boxId === box.id)
      .sort((a, b) => a.fiscalSerial.localeCompare(b.fiscalSerial, "es"));
  }, [box, printers]);

  async function handleSubmit(values: InventoryBoxFormValues) {
    if (!box) return;
    if (!canModify) {
      setFormError(forbiddenMessage("update", "inventoryBoxes"));
      return;
    }

    const bodyOrError = toInventoryBoxRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const updated = await updateInventoryBox(box.id, bodyOrError);
      setBox(updated);
      setEditOpen(false);
      toast.success(`${formatInventoryBoxLabel(updated.boxNumber)} actualizada.`);
    } catch (err) {
      setFormError(getInventoryBoxesErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!box) return;
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "inventoryBoxes"));
      return;
    }

    const label = formatInventoryBoxLabel(box.boxNumber);
    const warningSuffix =
      box.printerCount > 0
        ? ` Sus ${box.printerCount} impresora(s) asignada(s) quedarán sin caja.`
        : "";

    if (
      !(await confirm({
        title: "Confirmar",
        message: `¿Eliminar la ${label}?${warningSuffix}`,
        destructive: true,
      }))
    ) {
      return;
    }

    setDeleting(true);
    try {
      await deleteInventoryBox(box.id);
      toast.success(`${label} eliminada.`);
      router.push(inventoryBoxesListPath);
    } catch (err) {
      toast.error(getInventoryBoxesErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ResourceViewShell
        backHref={inventoryBoxesListPath}
        backLabel="Volver a cajas de inventario"
        title={
          box ? formatInventoryBoxLabel(box.boxNumber) : "Caja de inventario"
        }
        loading={loading}
        error={error}
        actions={
          box ? (
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
        {box && (
          <div className="space-y-6">
            <DetailSection title="Caja de inventario" layout="quad">
              <DetailField
                label="Número de caja"
                value={String(box.boxNumber)}
                mono
              />
              <DetailField
                label="Impresoras asignadas"
                value={String(box.printerCount)}
              />
              <DetailField
                label="Observaciones"
                value={box.observations || "Sin observaciones"}
              />
              <DetailField label="Creado el" value={formatDate(box.createdAt)} />
            </DetailSection>

            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-card-foreground">
                Impresoras en esta caja
              </h3>
              <div className="mt-4">
                {boxPrinters.length === 0 ? (
                  <EmptyState title="Esta caja no tiene impresoras asignadas." />
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <TableScroll>
                      <table className="w-full min-w-[540px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                            <th className="px-5 py-3 font-medium">
                              Serial fiscal
                            </th>
                            <th className="px-5 py-3 font-medium">Estatus</th>
                            <th className="px-5 py-3 font-medium">Firmware</th>
                          </tr>
                        </thead>
                        <tbody>
                          {boxPrinters.map((printer) => (
                            <ClickableTableRow
                              key={printer.id}
                              href={printerPath(printer.id)}
                            >
                              <td className="px-5 py-3.5 font-mono font-medium text-card-foreground">
                                {printer.fiscalSerial}
                              </td>
                              <td className="px-5 py-3.5 text-muted">
                                {
                                  PRINTER_STATUS_LABELS[
                                    normalizePrinterStatus(printer.status)
                                  ]
                                }
                              </td>
                              <td className="px-5 py-3.5 font-mono text-muted">
                                {printer.versionFirmware || "—"}
                              </td>
                            </ClickableTableRow>
                          ))}
                        </tbody>
                      </table>
                    </TableScroll>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </ResourceViewShell>

      {box && editOpen && (
        <InventoryBoxFormDialog
          mode="edit"
          box={box}
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
