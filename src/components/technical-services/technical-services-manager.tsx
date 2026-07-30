"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { TechnicalServiceFormDialog } from "@/components/technical-services/technical-service-form-dialog";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import { filterAllOption } from "@/lib/table-filter-options";
import { technicalServicePath } from "@/lib/resource-routes";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import {
  canCreateTechnicalServiceRecord,
  canDeleteTechnicalServiceRecord,
  canModifyTechnicalServiceRecord,
} from "@/lib/api-permissions";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { useFieldOperationsCatalog } from "@/hooks/use-field-operations-catalog";
import { filterTechnicalServicesInScope } from "@/lib/scope-filters";
import { reportListTableError } from "@/lib/api-error-message";
import { usePagination } from "@/hooks/use-pagination";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import { formatDateTime, formatMoney } from "@/lib/datetime-form";
import { technicalServiceTechnicianLabel } from "@/lib/record-labels";
import {
  toTechnicalServiceRequest,
  type TechnicalServiceFormValues,
} from "@/lib/technical-service-form";
import {
  createTechnicalService,
  deleteTechnicalService,
  fetchTechnicalServices,
  getTechnicalServicesErrorMessage,
  updateTechnicalService,
} from "@/lib/technical-services-api";
import type { TechnicalServiceResponse } from "@/types/technical-service";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";

type TechnicalServiceSortKey = "startAt" | "endAt" | "cost" | "id" | "createdAt";

export function TechnicalServicesManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canCreate = user ? canCreateTechnicalServiceRecord(user.role) : false;
  const canModify = user ? canModifyTechnicalServiceRecord(user.role) : false;
  const canDelete = user ? canDeleteTechnicalServiceRecord(user.role) : false;
  const catalog = useFieldOperationsCatalog();

  const [rows, setRows] = useState<TechnicalServiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<TechnicalServiceResponse | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const tableColumns = useTableColumnVisibility("technical-services");
  const [search, setSearch] = useState("");
  const [printerFilter, setPrinterFilter] = useState("all");
  const [technicianFilter, setTechnicianFilter] = useState("all");
  const [sort, setSort] = useState<TableSortState<TechnicalServiceSortKey>>(null);

  const printerLabelById = useMemo(
    () => new Map(catalog.printerOptions.map((p) => [p.value, p.label])),
    [catalog.printerOptions],
  );
  const technicianLabelById = useMemo(
    () => new Map(catalog.technicianUserOptions.map((t) => [t.value, t.label])),
    [catalog.technicianUserOptions],
  );

  const printerFilterOptions = useMemo(
    () => [filterAllOption("Todas las impresoras"), ...catalog.printerOptions],
    [catalog.printerOptions],
  );

  const technicianFilterOptions = useMemo(
    () => [filterAllOption("Todos los técnicos"), ...catalog.technicianUserOptions],
    [catalog.technicianUserOptions],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (
        printerFilter !== "all" &&
        String(row.printerId) !== printerFilter
      ) {
        return false;
      }
      if (
        technicianFilter !== "all" &&
        String(row.userId) !== technicianFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        row.id,
        row.printerId,
        row.userId,
        printerLabelById.get(String(row.printerId)),
        technicianLabelById.get(String(row.userId)),
        row.technicianName,
        row.technicianNationalId,
        row.reportedFailure,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    rows,
    search,
    printerFilter,
    technicianFilter,
    printerLabelById,
    technicianLabelById,
  ]);

  const sortedRows = useMemo(
    () =>
      sortTableRows(filteredRows, sort, {
        startAt: (a, b) => compareDateValues(a.startAt, b.startAt),
        endAt: (a, b) => compareDateValues(a.endAt, b.endAt),
        cost: (a, b) => compareNumberValues(a.cost, b.cost),
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
      }),
    [filteredRows, sort],
  );

  const pagination = usePagination(sortedRows);

  const loadRows = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setListError(null);
    }
    try {
      const data = await fetchTechnicalServices();
      const role = user?.role ?? "TECHNICIAN";
      const scoped = filterTechnicalServicesInScope(
        data,
        catalog.scopedPrinterIds,
        role,
        catalog.distributorId,
      );
      setRows(
        scoped.sort((a, b) => b.startAt.localeCompare(a.startAt, "es")),
      );
    } catch (err) {
      reportListTableError({
        message: getTechnicalServicesErrorMessage(err),
        setListError,
        toast,
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast, user?.role, catalog.scopedPrinterIds, catalog.distributorId]);

  useEffect(() => {
    if (catalog.loading) return;
    void loadRows();
  }, [catalog.loading, loadRows]);

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleSubmit(values: TechnicalServiceFormValues) {
    if (dialog === "create" && !canCreate) {
      setFormError(forbiddenMessage("create", "technicalServices"));
      return;
    }
    if (dialog === "edit" && !canModify) {
      setFormError(forbiddenMessage("update", "technicalServices"));
      return;
    }

    const bodyOrError = toTechnicalServiceRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (dialog === "create") {
        const created = await createTechnicalService(bodyOrError);
        toast.success("Servicio técnico registrado.", {
          href: technicalServicePath(created.id),
        });
      } else if (selected) {
        await updateTechnicalService(selected.id, bodyOrError);
        toast.success("Servicio técnico actualizado.", {
          href: technicalServicePath(selected.id),
        });
      }
      closeDialog();
      await loadRows();
    } catch (err) {
      const message = getTechnicalServicesErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: TechnicalServiceResponse, fromDialog = false) {
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "technicalServices"));
      return;
    }
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar el servicio técnico ${row.id}?`, destructive: true }))) return;
    setDeletingId(row.id);
    try {
      await deleteTechnicalService(row.id);
      if (fromDialog) closeDialog();
      toast.success("Servicio eliminado.");
      await loadRows({ silent: true });
    } catch (err) {
      const recordLabel =
        printerLabelById.get(String(row.printerId)) ??
        `Servicio técnico ${row.id}`;
      reportListTableError({
        message: getTechnicalServicesErrorMessage(err),
        recordLabel,
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
              onClick={() => {
                setSelected(null);
                setFormError(null);
                setDialog("create");
              }}
              className={cn(
                pageToolbarButtonClass,
                "bg-accent text-accent-foreground",
              )}
            >
              <Plus className="size-4" />
              Nuevo servicio
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
            Cargando servicios…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No hay servicios técnicos registrados." />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por impresora, técnico, falla…"
              resultCount={filteredRows.length}
              totalCount={rows.length}
              filters={[
                {
                  id: "printer",
                  label: "Impresora",
                  value: printerFilter,
                  onChange: setPrinterFilter,
                  options: printerFilterOptions,
                },
                {
                  id: "technician",
                  label: "Técnico",
                  value: technicianFilter,
                  onChange: setTechnicianFilter,
                  options: technicianFilterOptions,
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredRows.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[1100px] text-left text-sm">
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
                        <th className="px-5 py-3 font-medium">Impresora</th>
                        <th className="px-5 py-3 font-medium">Técnico</th>
                        <SortableTableHeader
                          label="Inicio"
                          sortDirection={sort?.key === "startAt" ? sort.direction : null}
                          onToggle={() =>
                            setSort((current) => toggleTableSort(current, "startAt"))
                          }
                        />
                        <SortableTableHeader
                          label="Fin"
                          sortDirection={sort?.key === "endAt" ? sort.direction : null}
                          onToggle={() =>
                            setSort((current) => toggleTableSort(current, "endAt"))
                          }
                        />
                        <th className="px-5 py-3 font-medium">Falla</th>
                        <SortableTableHeader
                          label="Costo"
                          sortDirection={sort?.key === "cost" ? sort.direction : null}
                          onToggle={() =>
                            setSort((current) => toggleTableSort(current, "cost"))
                          }
                        />
                        <th className="px-5 py-3 font-medium">Precinto</th>
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((row) => (
                        <ClickableTableRow
                          key={row.id}
                          href={technicalServicePath(row.id)}
                        >
                          <TableRowMetaCells
                            showId={tableColumns.showId}
                            showCreatedAt={tableColumns.showCreatedAt}
                            id={row.id}
                            createdAt={row.createdAt}
                            actions={
                              <td className="px-5 py-3.5" data-row-click="ignore">
                                <TableRowActionsMenu
                                  viewHref={technicalServicePath(row.id)}
                                  viewLabel={`Ver servicio técnico ${row.id}`}
                                  onEdit={
                                    canModify
                                      ? () => {
                                          setSelected(row);
                                          setFormError(null);
                                          setDialog("edit");
                                        }
                                      : undefined
                                  }
                                  onDelete={
                                    canDelete ? () => handleDelete(row) : undefined
                                  }
                                  deleting={deletingId === row.id}
                                />
                              </td>
                            }
                          >
                          <td className="max-w-[140px] px-5 py-3.5 font-mono text-card-foreground">
                            <TruncatedText maxClassName="max-w-[120px]" mono>
                              {printerLabelById.get(String(row.printerId)) ??
                                "—"}
                            </TruncatedText>
                          </td>
                          <td className="max-w-[160px] px-5 py-3.5 text-muted">
                            <TruncatedText maxClassName="max-w-[140px]">
                              {technicalServiceTechnicianLabel(
                                row,
                                catalog.technicianUserOptions,
                              )}
                            </TruncatedText>
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatDateTime(row.startAt)}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatDateTime(row.endAt)}
                          </td>
                          <td className="max-w-[160px] px-5 py-3.5 text-card-foreground">
                            <TruncatedText maxClassName="max-w-[140px]">
                              {row.reportedFailure || "—"}
                            </TruncatedText>
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatMoney(row.cost)}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {row.sealTampered ? "Violentado" : "OK"}
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

      <TechnicalServiceFormDialog
        mode={dialog === "create" ? "create" : "edit"}
        row={selected ?? undefined}
        open={dialog !== null}
        saving={saving}
        error={formError}
        catalogLoading={catalog.loading}
        canLoadPrinters={catalog.canLoadPrinters}
        printerOptions={catalog.printerOptions}
        technicianUserOptions={catalog.technicianUserOptions}
        currentUserRole={catalog.role}
        currentUserId={catalog.currentUserId}
        sealOptions={catalog.sealOptions}
        serviceCenterOptions={catalog.serviceCenterOptions}
        distributorOptions={catalog.distributorOptions}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
