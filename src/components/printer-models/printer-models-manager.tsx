"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Printer, RefreshCw } from "lucide-react";
import { PrinterModelFormDialog } from "@/components/printer-models/printer-model-form-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import {
  filterAllOption,
  uniqueFilterOptions,
} from "@/lib/table-filter-options";
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
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
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
import { TruncatedText } from "@/components/ui/truncated-text";
import { printerModelPath } from "@/lib/resource-routes";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";

type PrinterModelSortKey = "price" | "approvalDate" | "id" | "createdAt";

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
  const tableColumns = useTableColumnVisibility("printer-models");
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [sort, setSort] = useState<TableSortState<PrinterModelSortKey>>(null);

  const brandFilterOptions = useMemo(
    () => [
      filterAllOption("Todas las marcas"),
      ...uniqueFilterOptions(models.map((model) => model.brand)),
    ],
    [models],
  );

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models.filter((model) => {
      if (brandFilter !== "all" && model.brand !== brandFilter) return false;
      if (!q) return true;
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
  }, [models, search, brandFilter]);

  const sortedModels = useMemo(
    () =>
      sortTableRows(filteredModels, sort, {
        price: (a, b) => compareNumberValues(a.price, b.price),
        approvalDate: (a, b) =>
          compareDateValues(a.approvalDate, b.approvalDate),
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
      }),
    [filteredModels, sort],
  );

  const pagination = usePagination(sortedModels);

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
      <PageToolbar
        actions={
          <>
            <button
              type="button"
              onClick={loadModels}
              disabled={loading}
              className={cn(
                pageToolbarButtonClass,
                "border border-border bg-card text-foreground hover:bg-foreground/5 disabled:opacity-50",
              )}
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              Actualizar
            </button>
            {canCreate && (
              <button
                type="button"
                onClick={openCreate}
                className={cn(
                  pageToolbarButtonClass,
                  "bg-accent text-accent-foreground",
                )}
              >
                <Plus className="size-4" />
                Nuevo modelo
              </button>
            )}
          </>
        }
      />

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
          <EmptyState
            icon={Printer}
            title="No hay modelos de impresora registrados."
          />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por marca, modelo, providencia…"
              resultCount={filteredModels.length}
              totalCount={models.length}
              filters={[
                {
                  id: "brand",
                  label: "Marca",
                  value: brandFilter,
                  onChange: setBrandFilter,
                  options: brandFilterOptions,
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredModels.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[880px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <TableRowMetaHeaders
                          showId={tableColumns.showId}
                          showCreatedAt={tableColumns.showCreatedAt}
                          idSort={{
                            sortDirection:
                              sort?.key === "id" ? sort.direction : null,
                            onSortToggle: () =>
                              setSort((current) =>
                                toggleTableSort(current, "id"),
                              ),
                          }}
                          createdAtSort={{
                            sortDirection:
                              sort?.key === "createdAt" ? sort.direction : null,
                            onSortToggle: () =>
                              setSort((current) =>
                                toggleTableSort(current, "createdAt"),
                              ),
                          }}
                          actions={
                            <th className="px-5 py-3 font-medium text-right">
                              Acciones
                            </th>
                          }
                        >
                        <th className="px-5 py-3 font-medium">Marca</th>
                        <th className="px-5 py-3 font-medium">Modelo</th>
                        <SortableTableHeader
                          label="Precio"
                          sortDirection={sort?.key === "price" ? sort.direction : null}
                          onToggle={() =>
                            setSort((current) => toggleTableSort(current, "price"))
                          }
                        />
                        <th className="px-5 py-3 font-medium">Providencia</th>
                        <SortableTableHeader
                          label="Aprobación"
                          sortDirection={
                            sort?.key === "approvalDate" ? sort.direction : null
                          }
                          onToggle={() =>
                            setSort((current) =>
                              toggleTableSort(current, "approvalDate"),
                            )
                          }
                        />
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((model) => (
                        <ClickableTableRow
                          key={model.id}
                          href={printerModelPath(model.id)}
                        >
                          <TableRowMetaCells
                            showId={tableColumns.showId}
                            showCreatedAt={tableColumns.showCreatedAt}
                            id={model.id}
                            createdAt={model.createdAt}
                            actions={
                              <td className="px-5 py-3.5" data-row-click="ignore">
                                <TableRowActionsMenu
                                  viewHref={printerModelPath(model.id)}
                                  viewLabel={`Ver modelo ${modelLabel(model)}`}
                                  onEdit={
                                    canModify ? () => openEdit(model) : undefined
                                  }
                                  onDelete={
                                    canDelete ? () => handleDelete(model) : undefined
                                  }
                                  deleting={deletingId === model.id}
                                />
                              </td>
                            }
                          >
                          <td className="max-w-[140px] px-5 py-3.5">
                            <TruncatedText maxClassName="max-w-[120px]">
                              {model.brand}
                            </TruncatedText>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-card-foreground">
                            {model.modelCode}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-card-foreground">
                            {formatPrinterModelPrice(model.price)}
                          </td>
                          <td className="max-w-[180px] px-5 py-3.5 text-muted">
                            <TruncatedText maxClassName="max-w-[160px]">
                              {model.providencia || "—"}
                            </TruncatedText>
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatPrinterModelDate(model.approvalDate)}
                          </td>
                          </TableRowMetaCells>
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
      />
    </div>
  );
}
