"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { PrinterModelFormDialog } from "@/components/printer-models/printer-model-form-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import {
  canCreatePrinterModelRecord,
  canDeletePrinterModelRecord,
  canManagePrinterModels,
} from "@/lib/api-permissions";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { usePagination } from "@/hooks/use-pagination";
import {
  formatPrinterModelDate,
  formatPrinterModelPrice,
  toPrinterModelRequest,
  type PrinterModelFormValues,
} from "@/lib/printer-model-form";
import {
  createPrinterModel,
  deletePrinterModel,
  fetchPrinterModels,
  getPrinterModelsErrorMessage,
  updatePrinterModel,
} from "@/lib/printer-models-api";
import type { PrinterModelResponse } from "@/types/printer-model";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { printerModelPath } from "@/lib/resource-routes";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { ViewResourceLink } from "@/components/ui/view-resource-link";

function modelLabel(model: PrinterModelResponse) {
  return `${model.brand} ${model.modelCode}`.trim();
}

export function PrinterModelsManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canCreate = user ? canCreatePrinterModelRecord(user.role) : false;
  const canModify = user ? canManagePrinterModels(user.role) : false;
  const canDelete = user ? canDeletePrinterModelRecord(user.role) : false;
  const [models, setModels] = useState<PrinterModelResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<PrinterModelResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return models;
    return models.filter((model) => {
      const haystack = [
        model.id,
        model.brand,
        model.modelCode,
        model.providencia,
        model.approvalDate,
        model.price,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [models, search]);

  const pagination = usePagination(filteredModels);

  const loadModels = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const data = await fetchPrinterModels();
      setModels(
        data.sort((a, b) => {
          const brandCmp = a.brand.localeCompare(b.brand, "es");
          if (brandCmp !== 0) return brandCmp;
          return a.modelCode.localeCompare(b.modelCode, "es");
        }),
      );
    } catch (err) {
      const message = getPrinterModelsErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialog("create");
  }

  function openEdit(model: PrinterModelResponse) {
    setSelected(model);
    setFormError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(values: PrinterModelFormValues) {
    if (dialog === "create" && !canCreate) {
      setFormError(forbiddenMessage("create", "printerModels"));
      return;
    }
    if (dialog === "edit" && !canModify) {
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
    const label = `${bodyOrError.brand} ${bodyOrError.modelCode}`;

    try {
      if (dialog === "create") {
        const created = await createPrinterModel(bodyOrError);
        toast.success(`Modelo "${label}" creado correctamente.`, {
          href: printerModelPath(created.id),
        });
      } else if (selected) {
        await updatePrinterModel(selected.id, bodyOrError);
        toast.success(`Modelo "${label}" actualizado.`, {
          href: printerModelPath(selected.id),
        });
      }
      closeDialog();
      await loadModels();
    } catch (err) {
      const message = getPrinterModelsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(model: PrinterModelResponse, fromDialog = false) {
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "printerModels"));
      return;
    }
    const label = modelLabel(model);
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar el modelo "${label}"? Las impresoras vinculadas pueden verse afectadas.`, destructive: true }))) {
      return;
    }
    setDeletingId(model.id);
    try {
      await deletePrinterModel(model.id);
      if (fromDialog) closeDialog();
      await loadModels();
      toast.success(`Modelo "${label}" eliminado.`);
    } catch (err) {
      const message = getPrinterModelsErrorMessage(err);
      setListError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-4">
        <p className="min-w-0 flex-1 text-sm text-muted">
          Catálogo de modelos de impresora fiscal homologados. Solo un
          administrador puede añadir, editar o eliminar modelos.
        </p>
        <div className="flex w-full shrink-0 flex-col gap-2 max-md:w-full md:w-auto md:flex-row md:flex-nowrap">
          <button
            type="button"
            onClick={loadModels}
            disabled={loading}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-card md:w-auto px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Actualizar
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-accent px-3 py-2 md:w-auto text-sm font-medium text-accent-foreground"
            >
              <Plus className="size-4" />
              Nuevo modelo
            </button>
          )}
        </div>
      </div>

      {listError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
        >
          {listError}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="size-5 animate-spin" />
            Cargando modelos…
          </div>
        ) : models.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            No hay modelos de impresora registrados.
          </p>
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por marca, modelo, providencia…"
              resultCount={filteredModels.length}
              totalCount={models.length}
            />
            {filteredModels.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">
                No hay resultados con los filtros aplicados.
              </p>
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[880px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <th className="px-5 py-3 font-medium">ID</th>
                        <th className="px-5 py-3 font-medium">Marca</th>
                        <th className="px-5 py-3 font-medium">Modelo</th>
                        <th className="px-5 py-3 font-medium">Providencia</th>
                        <th className="px-5 py-3 font-medium">Aprobación</th>
                        <th className="px-5 py-3 font-medium">Precio</th>
                        <th className="px-5 py-3 font-medium text-right">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((model) => (
                        <ClickableTableRow
                          key={model.id}
                          href={printerModelPath(model.id)}
                        >
                          <td className="px-5 py-3.5 text-muted">{model.id}</td>
                          <td className="px-5 py-3.5 font-medium text-card-foreground">
                            {model.brand}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-card-foreground">
                            {model.modelCode}
                          </td>
                          <td className="max-w-[180px] truncate px-5 py-3.5 text-muted">
                            {model.providencia || "—"}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatPrinterModelDate(model.approvalDate)}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-card-foreground">
                            {formatPrinterModelPrice(model.price)}
                          </td>
                          <td className="px-5 py-3.5" data-row-click="ignore">
                            <div className="flex justify-end gap-1">
                              <ViewResourceLink
                                href={printerModelPath(model.id)}
                                label={`Ver modelo ${modelLabel(model)}`}
                              />
                              {canModify && (
                                <button
                                  type="button"
                                  onClick={() => openEdit(model)}
                                  className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                                  aria-label={`Editar ${modelLabel(model)}`}
                                >
                                  <Pencil className="size-4" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(model)}
                                  disabled={deletingId === model.id}
                                  className="rounded-lg p-2 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                                  aria-label={`Eliminar ${modelLabel(model)}`}
                                >
                                  {deletingId === model.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="size-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </ClickableTableRow>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
            <TablePagination pagination={pagination} />
              </>
            )}
          </>
        )}
      </div>

      <PrinterModelFormDialog
        mode={dialog === "create" ? "create" : "edit"}
        model={selected ?? undefined}
        open={dialog !== null}
        saving={saving}
        error={formError}
        onClose={closeDialog}
        onSubmit={handleSubmit}
        deleting={Boolean(selected && deletingId === selected.id)}
        onDelete={
          dialog === "edit" && selected
            ? () => void handleDelete(selected, true)
            : undefined
        }
      />
    </div>
  );
}
