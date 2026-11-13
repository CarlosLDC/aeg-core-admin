"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { InventoryBoxFormDialog } from "@/components/inventory-boxes/inventory-box-form-dialog";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { filterAllOption } from "@/lib/table-filter-options";
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useAuth } from "@/context/auth-provider";
import { useConfirm } from "@/context/confirm-provider";
import { useToast } from "@/context/toast-provider";
import { usePagination } from "@/hooks/use-pagination";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { useTableSearch } from "@/hooks/use-table-search";
import { reportListTableError } from "@/lib/api-error-message";
import {
  canCreateInventoryBoxRecord,
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
  createInventoryBox,
  deleteInventoryBox,
  fetchInventoryBoxes,
  getInventoryBoxesErrorMessage,
  updateInventoryBox,
} from "@/lib/inventory-boxes-api";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { inventoryBoxPath } from "@/lib/resource-routes";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";

function compareTextValues(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  return (a ?? "").localeCompare(b ?? "", "es");
}
import { cn } from "@/lib/utils";
import type { InventoryBoxResponse } from "@/types/inventory-box";

type InventoryBoxSortKey =
  | "boxNumber"
  | "printerCount"
  | "observations"
  | "id"
  | "createdAt";

type OccupationFilter = "all" | "occupied" | "empty";

export function InventoryBoxesManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canCreate = user ? canCreateInventoryBoxRecord(user.role) : false;
  const canModify = user ? canModifyInventoryBoxRecord(user.role) : false;
  const canDelete = user ? canDeleteInventoryBoxRecord(user.role) : false;

  const [boxes, setBoxes] = useState<InventoryBoxResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<InventoryBoxResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [occupationFilter, setOccupationFilter] =
    useState<OccupationFilter>("all");

  const tableColumns = useTableColumnVisibility("inventory-boxes");
  const [search, setSearch] = useTableSearch("/inventory-boxes");
  const [sort, setSort] = useState<TableSortState<InventoryBoxSortKey>>({
    key: "boxNumber",
    direction: "asc",
  });

  const nextSuggestedBoxNumber = useMemo(() => {
    if (boxes.length === 0) return 1;
    return Math.max(...boxes.map((box) => box.boxNumber)) + 1;
  }, [boxes]);

  const filteredBoxes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return boxes.filter((box) => {
      if (occupationFilter === "occupied" && box.printerCount === 0) {
        return false;
      }
      if (occupationFilter === "empty" && box.printerCount > 0) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        box.id,
        box.boxNumber,
        formatInventoryBoxLabel(box.boxNumber),
        box.observations,
        box.printerCount,
        box.createdAt,
        formatDate(box.createdAt),
      ]
        .filter((item) => item !== null && item !== undefined && item !== "")
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [boxes, occupationFilter, search]);

  const sortedBoxes = useMemo(
    () =>
      sortTableRows(filteredBoxes, sort, {
        boxNumber: (a, b) => compareNumberValues(a.boxNumber, b.boxNumber),
        printerCount: (a, b) =>
          compareNumberValues(a.printerCount, b.printerCount),
        observations: (a, b) =>
          compareTextValues(a.observations, b.observations),
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
      }),
    [filteredBoxes, sort],
  );

  const pagination = usePagination(sortedBoxes, undefined, {
    section: "/inventory-boxes",
  });

  const loadBoxes = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setLoading(true);
        setListError(null);
      }
      try {
        const data = await fetchInventoryBoxes();
        setBoxes(data.sort((a, b) => a.boxNumber - b.boxNumber));
      } catch (err) {
        reportListTableError({
          message: getInventoryBoxesErrorMessage(err),
          setListError,
          toast,
        });
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadBoxes();
  }, [loadBoxes]);

  function openCreate() {
    setSelected(null);
    setFormError(null);
    setDialog("create");
  }

  function openEdit(box: InventoryBoxResponse) {
    setSelected(box);
    setFormError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(values: InventoryBoxFormValues) {
    if (dialog === "create" && !canCreate) {
      setFormError(forbiddenMessage("create", "inventoryBoxes"));
      return;
    }
    if (dialog === "edit" && !canModify) {
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
    const label = formatInventoryBoxLabel(bodyOrError.boxNumber);

    try {
      if (dialog === "create") {
        const created = await createInventoryBox(bodyOrError);
        toast.success(`${label} creada correctamente.`, {
          href: inventoryBoxPath(created.id),
        });
      } else if (selected) {
        await updateInventoryBox(selected.id, bodyOrError);
        toast.success(`${label} actualizada.`, {
          href: inventoryBoxPath(selected.id),
        });
      }
      closeDialog();
      await loadBoxes({ silent: true });
    } catch (err) {
      const message = getInventoryBoxesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(box: InventoryBoxResponse) {
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

    setDeletingId(box.id);
    try {
      await deleteInventoryBox(box.id);
      await loadBoxes({ silent: true });
      toast.success(`${label} eliminada.`);
    } catch (err) {
      reportListTableError({
        message: getInventoryBoxesErrorMessage(err),
        recordLabel: label,
        setListError,
        toast,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-content-stack">
      <PageToolbar
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className={cn(
                pageToolbarButtonClass,
                "bg-accent text-accent-foreground",
              )}
            >
              <Plus className="size-4" />
              Nueva caja
            </button>
          ) : undefined
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
            Cargando cajas de inventario…
          </div>
        ) : boxes.length === 0 ? (
          <EmptyState title="No hay cajas de inventario registradas." />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por número de caja u observaciones…"
              resultCount={filteredBoxes.length}
              totalCount={boxes.length}
              filters={[
                {
                  id: "occupation",
                  label: "Contenido",
                  value: occupationFilter,
                  onChange: (value) =>
                    setOccupationFilter(value as OccupationFilter),
                  options: [
                    filterAllOption(),
                    { value: "occupied", label: "Con impresoras" },
                    { value: "empty", label: "Vacías" },
                  ],
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredBoxes.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[760px] text-left text-sm">
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
                            <th className="px-5 py-3 text-right font-medium">
                              Acciones
                            </th>
                          }
                        >
                          <SortableTableHeader
                            label="Caja"
                            sortDirection={
                              sort?.key === "boxNumber" ? sort.direction : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "boxNumber"),
                              )
                            }
                          />
                          <SortableTableHeader
                            label="Impresoras"
                            sortDirection={
                              sort?.key === "printerCount"
                                ? sort.direction
                                : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "printerCount"),
                              )
                            }
                          />
                          <SortableTableHeader
                            label="Observaciones"
                            sortDirection={
                              sort?.key === "observations"
                                ? sort.direction
                                : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "observations"),
                              )
                            }
                          />
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((box) => {
                        const label = formatInventoryBoxLabel(box.boxNumber);
                        return (
                          <ClickableTableRow
                            key={box.id}
                            href={inventoryBoxPath(box.id)}
                          >
                            <TableRowMetaCells
                              showId={tableColumns.showId}
                              showCreatedAt={tableColumns.showCreatedAt}
                              id={box.id}
                              createdAt={box.createdAt}
                              actions={
                                <td
                                  className="px-5 py-3.5"
                                  data-row-click="ignore"
                                >
                                  <TableRowActionsMenu
                                    viewHref={inventoryBoxPath(box.id)}
                                    viewLabel={`Ver ${label}`}
                                    onEdit={
                                      canModify
                                        ? () => openEdit(box)
                                        : undefined
                                    }
                                    onDelete={
                                      canDelete
                                        ? () => void handleDelete(box)
                                        : undefined
                                    }
                                    deleting={deletingId === box.id}
                                  />
                                </td>
                              }
                            >
                              <td className="px-5 py-3.5 font-mono font-medium text-card-foreground">
                                {label}
                              </td>
                              <td className="px-5 py-3.5">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                    box.printerCount > 0
                                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                      : "bg-foreground/10 text-muted",
                                  )}
                                >
                                  {box.printerCount}{" "}
                                  {box.printerCount === 1
                                    ? "impresora"
                                    : "impresoras"}
                                </span>
                              </td>
                              <td className="max-w-[320px] px-5 py-3.5 text-muted">
                                <TruncatedText maxClassName="max-w-[300px]">
                                  {box.observations || "—"}
                                </TruncatedText>
                              </td>
                            </TableRowMetaCells>
                          </ClickableTableRow>
                        );
                      })}
                    </tbody>
                  </table>
                </TableScroll>
                <TablePagination pagination={pagination} />
              </>
            )}
          </>
        )}
      </div>

      <InventoryBoxFormDialog
        mode={dialog === "create" ? "create" : "edit"}
        box={selected ?? undefined}
        suggestedBoxNumber={
          dialog === "create" ? nextSuggestedBoxNumber : undefined
        }
        open={dialog !== null}
        saving={saving}
        error={formError}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
