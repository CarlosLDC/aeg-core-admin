"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { AnnualInspectionFormDialog } from "@/components/annual-inspections/annual-inspection-form-dialog";
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
import { annualInspectionPath } from "@/lib/resource-routes";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/context/toast-provider";
import { useConfirm } from "@/context/confirm-provider";
import {
  canCreateAnnualInspectionRecord,
  canDeleteAnnualInspectionRecord,
  canModifyAnnualInspectionRecord,
} from "@/lib/api-permissions";
import { forbiddenMessage } from "@/lib/permissions/messages";
import { useFieldOperationsCatalog } from "@/hooks/use-field-operations-catalog";
import { filterAnnualInspectionsInScope } from "@/lib/scope-filters";
import { reportListTableError } from "@/lib/api-error-message";
import { usePagination } from "@/hooks/use-pagination";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { formatDate } from "@/lib/datetime-form";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import {
  toAnnualInspectionRequest,
  type AnnualInspectionFormValues,
} from "@/lib/annual-inspection-form";
import {
  createAnnualInspection,
  deleteAnnualInspection,
  fetchAnnualInspections,
  getAnnualInspectionsErrorMessage,
  updateAnnualInspection,
} from "@/lib/annual-inspections-api";
import type { AnnualInspectionResponse } from "@/types/annual-inspection";
import { cn } from "@/lib/utils";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";

type AnnualInspectionSortKey =
  | "inspectionDate"
  | "photoCount"
  | "id"
  | "createdAt";

export function AnnualInspectionsManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkHandled = useRef(false);
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const canCreate = user ? canCreateAnnualInspectionRecord(user.role) : false;
  const canModify = user ? canModifyAnnualInspectionRecord(user.role) : false;
  const canDelete = user ? canDeleteAnnualInspectionRecord(user.role) : false;
  const catalog = useFieldOperationsCatalog();

  const [rows, setRows] = useState<AnnualInspectionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<AnnualInspectionResponse | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const tableColumns = useTableColumnVisibility("annual-inspections");
  const [search, setSearch] = useState("");
  const [printerFilter, setPrinterFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [sort, setSort] = useState<TableSortState<AnnualInspectionSortKey>>(null);
  const presetPrinterId = searchParams.get("printerId") ?? undefined;

  useEffect(() => {
    if (deepLinkHandled.current || catalog.loading) return;
    if (searchParams.get("action") !== "create" || !presetPrinterId || !canCreate) {
      return;
    }
    deepLinkHandled.current = true;
    setFormError(null);
    setSelected(null);
    setDialog("create");
    router.replace("/annual-inspections", { scroll: false });
  }, [catalog.loading, searchParams, presetPrinterId, canCreate, router]);

  const printerLabelById = useMemo(
    () => new Map(catalog.printerOptions.map((p) => [p.value, p.label])),
    [catalog.printerOptions],
  );
  const employeeLabelById = useMemo(
    () => new Map(catalog.employeeOptions.map((e) => [e.value, e.label])),
    [catalog.employeeOptions],
  );

  const printerFilterOptions = useMemo(
    () => [filterAllOption("Todas las impresoras"), ...catalog.printerOptions],
    [catalog.printerOptions],
  );

  const employeeFilterOptions = useMemo(
    () => [filterAllOption("Todos los empleados"), ...catalog.employeeOptions],
    [catalog.employeeOptions],
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
        employeeFilter !== "all" &&
        String(row.employeeId) !== employeeFilter
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        row.id,
        row.printerId,
        row.employeeId,
        printerLabelById.get(String(row.printerId)),
        employeeLabelById.get(String(row.employeeId)),
        row.notes,
        row.inspectionDate,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    rows,
    search,
    printerFilter,
    employeeFilter,
    printerLabelById,
    employeeLabelById,
  ]);

  const sortedRows = useMemo(
    () =>
      sortTableRows(filteredRows, sort, {
        inspectionDate: (a, b) =>
          compareDateValues(a.inspectionDate, b.inspectionDate),
        photoCount: (a, b) =>
          compareNumberValues(a.photoUrls?.length ?? 0, b.photoUrls?.length ?? 0),
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
      const data = await fetchAnnualInspections();
      const role = user?.role ?? "SERVICE_CENTER";
      const scoped = filterAnnualInspectionsInScope(
        data,
        catalog.scopedPrinterIds,
        catalog.scopedEmployeeIds,
        role,
      );
      setRows(
        scoped.sort((a, b) =>
          (b.inspectionDate ?? b.createdAt).localeCompare(
            a.inspectionDate ?? a.createdAt,
            "es",
          ),
        ),
      );
    } catch (err) {
      reportListTableError({
        message: getAnnualInspectionsErrorMessage(err),
        setListError,
        toast,
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [
    toast,
    user?.role,
    catalog.scopedPrinterIds,
    catalog.scopedEmployeeIds,
  ]);

  useEffect(() => {
    if (catalog.loading) return;
    void loadRows();
  }, [catalog.loading, loadRows]);

  async function handleSubmit(values: AnnualInspectionFormValues) {
    if (dialog === "create" && !canCreate) {
      setFormError(forbiddenMessage("create", "annualInspections"));
      return;
    }
    if (dialog === "edit" && !canModify) {
      setFormError(forbiddenMessage("update", "annualInspections"));
      return;
    }

    const bodyOrError = toAnnualInspectionRequest(values);
    if (typeof bodyOrError === "string") {
      setFormError(bodyOrError);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (dialog === "create") {
        const created = await createAnnualInspection(bodyOrError);
        toast.success("Inspección anual registrada.", {
          href: annualInspectionPath(created.id),
        });
      } else if (selected) {
        await updateAnnualInspection(selected.id, bodyOrError);
        toast.success("Inspección actualizada.", {
          href: annualInspectionPath(selected.id),
        });
      }
      closeDialog();
      await loadRows();
    } catch (err) {
      const message = getAnnualInspectionsErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setFormError(null);
  }

  async function handleDelete(row: AnnualInspectionResponse, fromDialog = false) {
    if (!canDelete) {
      toast.error(forbiddenMessage("delete", "annualInspections"));
      return;
    }
    if (!(await confirm({ title: "Confirmar", message: `¿Eliminar la inspección ${row.id}?`, destructive: true }))) return;
    setDeletingId(row.id);
    try {
      await deleteAnnualInspection(row.id);
      if (fromDialog) closeDialog();
      toast.success("Inspección eliminada.");
      await loadRows({ silent: true });
    } catch (err) {
      const recordLabel =
        printerLabelById.get(String(row.printerId)) ??
        `Inspección ${row.id}`;
      reportListTableError({
        message: getAnnualInspectionsErrorMessage(err),
        recordLabel,
        setListError,
        toast,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
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
              Nueva inspección
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
            Cargando inspecciones…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No hay inspecciones anuales registradas." />
        ) : (
          <>
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por impresora, empleado, fecha…"
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
                  id: "employee",
                  label: "Empleado",
                  value: employeeFilter,
                  onChange: setEmployeeFilter,
                  options: employeeFilterOptions,
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />
            {filteredRows.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[900px] text-left text-sm">
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
                        <th className="px-5 py-3 font-medium">Empleado</th>
                        <SortableTableHeader
                          label="Fecha"
                          sortDirection={
                            sort?.key === "inspectionDate" ? sort.direction : null
                          }
                          onToggle={() =>
                            setSort((current) =>
                              toggleTableSort(current, "inspectionDate"),
                            )
                          }
                        />
                        <th className="px-5 py-3 font-medium">Precinto</th>
                        <SortableTableHeader
                          label="Fotos"
                          sortDirection={
                            sort?.key === "photoCount" ? sort.direction : null
                          }
                          onToggle={() =>
                            setSort((current) =>
                              toggleTableSort(current, "photoCount"),
                            )
                          }
                        />
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((row) => (
                        <ClickableTableRow
                          key={row.id}
                          href={annualInspectionPath(row.id)}
                        >
                          <TableRowMetaCells
                            showId={tableColumns.showId}
                            showCreatedAt={tableColumns.showCreatedAt}
                            id={row.id}
                            createdAt={row.createdAt}
                            actions={
                              <td className="px-5 py-3.5" data-row-click="ignore">
                                <TableRowActionsMenu
                                  viewHref={annualInspectionPath(row.id)}
                                  viewLabel={`Ver inspección ${row.id}`}
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
                          <td className="max-w-[180px] px-5 py-3.5 text-muted">
                            <TruncatedText maxClassName="max-w-[160px]">
                              {employeeLabelById.get(String(row.employeeId)) ??
                                "—"}
                            </TruncatedText>
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {formatDate(row.inspectionDate)}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {row.sealTampered ? "Violentado" : "OK"}
                          </td>
                          <td className="px-5 py-3.5 text-muted">
                            {row.photoUrls?.length ?? 0}
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

      <AnnualInspectionFormDialog
        mode={dialog === "create" ? "create" : "edit"}
        row={selected ?? undefined}
        open={dialog !== null}
        saving={saving}
        error={formError}
        catalogLoading={catalog.loading}
        canLoadPrinters={catalog.canLoadPrinters}
        printerOptions={catalog.printerOptions}
        employeeOptions={catalog.employeeOptions}
        presetPrinterId={presetPrinterId}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
