"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  filterPrintersByQuickFilter,
  filterPrintersForBranch,
  getBranchPrinterStats,
  type BranchPrinterQuickFilter,
} from "@/lib/branch-printers";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import {
  TableQuickFilterButton,
  TableQuickFilters,
} from "@/components/ui/table-quick-filters";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableScroll } from "@/components/ui/table-scroll";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { TableRowActionsMenu } from "@/components/ui/table-row-actions-menu";
import {
  TableRowMetaCells,
  TableRowMetaHeaders,
} from "@/components/ui/table-meta-column-slots";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { usePagination } from "@/hooks/use-pagination";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { useToast } from "@/context/toast-provider";
import {
  compareDateValues,
  compareNumberValues,
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import {
  DEVICE_TYPE_LABELS,
  PRINTER_STATUS_LABELS,
  printerModelLabel,
} from "@/lib/printer-form";
import { normalizePrinterStatus, printerStatusLabel } from "@/lib/printer-status";
import { formatDate } from "@/lib/datetime-form";
import { filterAllOption } from "@/lib/table-filter-options";
import { loadCatalogRoles } from "@/lib/catalog-roles-cache";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import { fetchPrinters, getPrintersErrorMessage } from "@/lib/printers-api";
import { printerPath } from "@/lib/resource-routes";
import { PRINTER_STATUSES } from "@/types/printer";
import type { BranchWithRoles } from "@/types/branch";
import type { ClientResponse } from "@/types/branch-role";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse, PrinterStatus } from "@/types/printer";

type BranchPrinterSortKey =
  | "id"
  | "createdAt"
  | "fiscalSerial"
  | "model"
  | "status"
  | "installationDate";

type BranchPrintersTableProps = {
  branch: BranchWithRoles;
  client?: ClientResponse | null;
};

export function BranchPrintersTable({
  branch,
  client,
}: BranchPrintersTableProps) {
  const toast = useToast();
  const [allPrinters, setAllPrinters] = useState<PrinterResponse[]>([]);
  const [models, setModels] = useState<PrinterModelResponse[]>([]);
  const [clients, setClients] = useState<ClientResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] =
    useState<BranchPrinterQuickFilter>("all");
  const [statusFilter, setStatusFilter] = useState<PrinterStatus | "all">("all");
  const [sort, setSort] = useState<TableSortState<BranchPrinterSortKey>>(null);

  const tableColumns = useTableColumnVisibility(`branch-printers-${branch.id}`);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setListError(null);
    }
    try {
      const [printersData, modelsData, catalogRoles] = await Promise.all([
        fetchPrinters(),
        fetchPrinterModels(),
        loadCatalogRoles().catch(() => ({ clients: [], distributors: [], serviceCenters: [] })),
      ]);
      setAllPrinters(printersData);
      setModels(modelsData);
      setClients(catalogRoles.clients ?? []);
    } catch (err) {
      const msg = getPrintersErrorMessage(err);
      setListError(msg);
      toast.error(msg);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const modelsById = useMemo(
    () => new Map(models.map((m) => [m.id, m])),
    [models],
  );

  const branchPrinters = useMemo(
    () => filterPrintersForBranch(allPrinters, branch, client, clients),
    [allPrinters, branch, client, clients],
  );

  const stats = useMemo(
    () => getBranchPrinterStats(branchPrinters),
    [branchPrinters],
  );

  const statusFilterOptions = useMemo(
    () => [
      filterAllOption("Todos los estatus"),
      ...PRINTER_STATUSES.map((status) => ({
        value: status,
        label: PRINTER_STATUS_LABELS[status],
      })),
    ],
    [],
  );

  const filteredPrinters = useMemo(() => {
    let list = filterPrintersByQuickFilter(branchPrinters, quickFilter);

    if (statusFilter !== "all") {
      list = list.filter((p) => normalizePrinterStatus(p.status) === statusFilter);
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter((printer) => {
      const model = modelsById.get(printer.modelId);
      const modelLabel = model ? printerModelLabel(model) : "";
      const statusLabel = printerStatusLabel(printer.status);
      const deviceTypeLabel =
        DEVICE_TYPE_LABELS[printer.deviceType] ?? printer.deviceType;

      const haystack = [
        printer.id,
        printer.fiscalSerial,
        modelLabel,
        statusLabel,
        deviceTypeLabel,
        printer.versionFirmware ?? "",
        printer.macAddress ?? "",
        printer.installationDate ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [branchPrinters, quickFilter, statusFilter, search, modelsById]);

  const sortedPrinters = useMemo(
    () =>
      sortTableRows(filteredPrinters, sort, {
        id: (a, b) => compareNumberValues(a.id, b.id),
        createdAt: (a, b) => compareDateValues(a.createdAt, b.createdAt),
        fiscalSerial: (a, b) =>
          a.fiscalSerial.localeCompare(b.fiscalSerial, "es"),
        model: (a, b) => {
          const mA = modelsById.get(a.modelId)?.modelCode ?? "";
          const mB = modelsById.get(b.modelId)?.modelCode ?? "";
          return mA.localeCompare(mB, "es");
        },
        status: (a, b) => a.status.localeCompare(b.status, "es"),
        installationDate: (a, b) =>
          compareDateValues(a.installationDate, b.installationDate),
      }),
    [filteredPrinters, sort, modelsById],
  );

  const pagination = usePagination(sortedPrinters);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-card-foreground">
            Impresoras asociadas
          </h3>
          <p className="text-xs text-muted">
            Equipos fiscales registrados para esta empresa
          </p>
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
            Cargando impresoras…
          </div>
        ) : branchPrinters.length === 0 ? (
          <EmptyState
            title="Esta empresa no tiene impresoras asociadas."
            description="Las impresoras vinculadas al cliente o gestionadas por la distribuidora aparecerán aquí."
          />
        ) : (
          <>
            <TableQuickFilters>
              <TableQuickFilterButton
                active={quickFilter === "all"}
                onClick={() => setQuickFilter("all")}
              >
                Todas ({stats.total})
              </TableQuickFilterButton>
              <TableQuickFilterButton
                active={quickFilter === "asignada"}
                onClick={() => setQuickFilter("asignada")}
              >
                Asignadas ({stats.assigned})
              </TableQuickFilterButton>
              <TableQuickFilterButton
                active={quickFilter === "enajenada"}
                onClick={() => setQuickFilter("enajenada")}
              >
                Enajenadas ({stats.disposed})
              </TableQuickFilterButton>
              {stats.other > 0 && (
                <TableQuickFilterButton
                  active={quickFilter === "other"}
                  onClick={() => setQuickFilter("other")}
                >
                  Otras ({stats.other})
                </TableQuickFilterButton>
              )}
            </TableQuickFilters>

            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por serial, modelo, estatus…"
              resultCount={filteredPrinters.length}
              totalCount={branchPrinters.length}
              filters={[
                {
                  id: "status",
                  label: "Estatus",
                  value: statusFilter,
                  onChange: (v) => setStatusFilter(v as PrinterStatus | "all"),
                  options: statusFilterOptions,
                },
              ]}
              columns={tableColumns.toolbarColumns}
            />

            {filteredPrinters.length === 0 ? (
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
                            <th className="px-5 py-3 font-medium text-right">
                              Acciones
                            </th>
                          }
                        >
                          <SortableTableHeader
                            label="Serial fiscal"
                            sortDirection={
                              sort?.key === "fiscalSerial"
                                ? sort.direction
                                : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "fiscalSerial"),
                              )
                            }
                          />
                          <SortableTableHeader
                            label="Modelo"
                            sortDirection={
                              sort?.key === "model" ? sort.direction : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "model"),
                              )
                            }
                          />
                          <SortableTableHeader
                            label="Estatus"
                            sortDirection={
                              sort?.key === "status" ? sort.direction : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "status"),
                              )
                            }
                          />
                          <th className="px-5 py-3 font-medium">Dispositivo</th>
                          <SortableTableHeader
                            label="Fecha de instalación"
                            sortDirection={
                              sort?.key === "installationDate"
                                ? sort.direction
                                : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "installationDate"),
                              )
                            }
                          />
                          <th className="px-5 py-3 font-medium">Pagada</th>
                        </TableRowMetaHeaders>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.paginatedItems.map((printer) => {
                        const model = modelsById.get(printer.modelId);
                        const modelName = model
                          ? printerModelLabel(model)
                          : `Modelo #${printer.modelId}`;

                        return (
                          <ClickableTableRow
                            key={printer.id}
                            href={printerPath(printer.id)}
                          >
                            <TableRowMetaCells
                              showId={tableColumns.showId}
                              showCreatedAt={tableColumns.showCreatedAt}
                              id={printer.id}
                              createdAt={printer.createdAt}
                              actions={
                                <td
                                  className="px-5 py-3.5"
                                  data-row-click="ignore"
                                >
                                  <TableRowActionsMenu
                                    viewHref={printerPath(printer.id)}
                                    viewLabel={`Ver impresora ${printer.fiscalSerial}`}
                                  />
                                </td>
                              }
                            >
                              <td className="px-5 py-3.5 font-mono font-medium text-card-foreground">
                                {printer.fiscalSerial}
                              </td>
                              <td className="px-5 py-3.5 text-card-foreground">
                                {modelName}
                              </td>
                              <td className="px-5 py-3.5" data-row-click="ignore">
                                <PrinterStatusBadge status={printer.status} />
                              </td>
                              <td className="px-5 py-3.5 text-muted">
                                {DEVICE_TYPE_LABELS[printer.deviceType] ??
                                  printer.deviceType}
                              </td>
                              <td className="px-5 py-3.5 text-muted">
                                {printer.installationDate
                                  ? formatDate(printer.installationDate)
                                  : "—"}
                              </td>
                              <td className="px-5 py-3.5 text-muted">
                                {printer.paid ? (
                                  <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                                    Sí
                                  </span>
                                ) : (
                                  <span className="inline-flex rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    No
                                  </span>
                                )}
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
    </section>
  );
}
