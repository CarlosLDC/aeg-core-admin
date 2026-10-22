"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Loader2,
  Printer as PrinterIcon,
  RefreshCw,
} from "lucide-react";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { pageToolbarButtonClass } from "@/components/ui/page-toolbar";
import {
  TableQuickFilterButton,
  TableQuickFilters,
} from "@/components/ui/table-quick-filters";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { EmptyState, TableFilterEmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SortableTableHeader } from "@/components/ui/sortable-table-header";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { usePagination } from "@/hooks/use-pagination";
import { DISTRIBUTOR_PRINTER_QUICK_FILTERS } from "@/lib/distributor-printer-filters";
import { PRINTER_STATUS_LABELS } from "@/lib/printer-form";
import { filterAllOption } from "@/lib/table-filter-options";
import {
  sortTableRows,
  toggleTableSort,
} from "@/lib/table-sort";
import { toolsPrinterPath } from "@/lib/resource-routes";
import { useToolsPrinters } from "@/modules/tools/printers/use-tools-printers";
import type { ToolsPrinterSortKey } from "@/modules/tools";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import type { PrinterStatus } from "@/types/printer";
import { PRINTER_STATUSES } from "@/types/printer";
import { isDistributorPanelRole } from "@/types/user";
import { cn } from "@/lib/utils";
import {
  ToolsPage,
  ToolsSectionHeading,
} from "@/components/tools/tools-ui";

const TOOLS_PAGE_SIZE = 5;

function compareToolsPrinters(a: ToolsPrinter, b: ToolsPrinter): number {
  return (a.serial ?? "").localeCompare(b.serial ?? "", "es");
}

export function ToolsPrintersManager() {
  const {
    role,
    printers: searchResults,
    allPrinters,
    loading,
    error,
    query,
    setQuery,
    reload,
    distributorFilter,
    setDistributorFilter,
    adminStatusFilter,
    setAdminStatusFilter,
    sort,
    setSort,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useToolsPrinters();

  const isDistributor = role != null && isDistributorPanelRole(role);
  const isAdmin = role === "ADMIN";

  const statusFiltered = useMemo(() => {
    let rows = searchResults;

    if (isDistributor) {
      if (distributorFilter !== "all") {
        rows = rows.filter(
          (printer) => printer.status === distributorFilter,
        );
      }
    } else if (adminStatusFilter !== "all") {
      rows = rows.filter((printer) => printer.status === adminStatusFilter);
    }

    return rows;
  }, [
    searchResults,
    isDistributor,
    distributorFilter,
    adminStatusFilter,
  ]);

  const sortedPrinters = useMemo(() => {
    const comparators: Partial<
      Record<ToolsPrinterSortKey, (a: ToolsPrinter, b: ToolsPrinter) => number>
    > = {
      serial: compareToolsPrinters,
    };
    return sortTableRows(statusFiltered, sort, comparators);
  }, [statusFiltered, sort]);

  const pagination = usePagination(sortedPrinters, TOOLS_PAGE_SIZE, {
    page,
    setPage,
    pageSize,
    setPageSize,
  });
  const { paginatedItems: visiblePrinters } = pagination;

  const adminStatusFilterOptions = useMemo(
    () => [
      filterAllOption("Todos los estatus"),
      ...PRINTER_STATUSES.map((status) => ({
        value: status,
        label: PRINTER_STATUS_LABELS[status],
      })),
    ],
    [],
  );

  function handleSearchChange(nextQuery: string) {
    setQuery(nextQuery);
    setPage(1);
  }

  return (
    <ToolsPage>
      <ToolsSectionHeading
        icon={PrinterIcon}
        tone="slate"
        title="Impresoras"
        description="Seleccione una impresora para abrir sus operaciones de campo."
        actions={
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className={cn(
              pageToolbarButtonClass,
              "border border-border bg-card hover:bg-foreground/[0.03]",
            )}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
            Recargar
          </button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="size-5 animate-spin" />
            Cargando impresoras…
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorState
              message={error}
              onRetry={() => void reload()}
              retrying={loading}
            />
          </div>
        ) : allPrinters.length === 0 ? (
          <EmptyState
            icon={PrinterIcon}
            title="No hay impresoras disponibles"
            description="No se encontraron impresoras en tu alcance operativo."
          />
        ) : (
          <>
            {isDistributor ? (
              <TableQuickFilters label="Vista rápida">
                {DISTRIBUTOR_PRINTER_QUICK_FILTERS.map((filter) => (
                  <TableQuickFilterButton
                    key={filter.value}
                    active={distributorFilter === filter.value}
                    onClick={() => {
                      setDistributorFilter(filter.value);
                      setPage(1);
                    }}
                  >
                    {filter.label}
                  </TableQuickFilterButton>
                ))}
              </TableQuickFilters>
            ) : null}

            <DataTableToolbar
              search={query}
              onSearchChange={handleSearchChange}
              searchPlaceholder="Buscar por serial, cliente, ciudad, distribuidor…"
              resultCount={statusFiltered.length}
              totalCount={allPrinters.length}
              filters={
                isDistributor
                  ? undefined
                  : [
                      {
                        id: "status",
                        label: "Estatus",
                        value: adminStatusFilter,
                        onChange: (value) => {
                          setAdminStatusFilter(
                            value === "all" ||
                              PRINTER_STATUSES.includes(value as PrinterStatus)
                              ? (value as PrinterStatus | "all")
                              : "all",
                          );
                          setPage(1);
                        },
                        options: adminStatusFilterOptions,
                      },
                    ]
              }
            />

            {statusFiltered.length === 0 ? (
              <TableFilterEmptyState />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                        <SortableTableHeader
                          label="Serial"
                          sortDirection={
                            sort?.key === "serial" ? sort.direction : null
                          }
                          onToggle={() =>
                            setSort((current) =>
                              toggleTableSort(current, "serial"),
                            )
                          }
                        />
                        <th className="whitespace-nowrap px-5 py-3 font-medium">
                          Ciudad
                        </th>
                        <th className="whitespace-nowrap px-5 py-3 font-medium">
                          Firmware
                        </th>
                        {isAdmin ? (
                          <th className="whitespace-nowrap px-5 py-3 font-medium">
                            Distribuidor
                          </th>
                        ) : null}
                        <th className="whitespace-nowrap px-5 py-3 font-medium">
                          Cliente
                        </th>
                        <th className="w-10 px-3 py-3" aria-hidden />
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePrinters.map((printer) => (
                        <ClickableTableRow
                          key={printer.id}
                          href={toolsPrinterPath(printer.serial)}
                        >
                          <td className="px-5 py-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate font-medium tabular-nums text-card-foreground">
                                {printer.serial}
                              </span>
                              {!printer.macAddress ? (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                                  <AlertTriangle
                                    className="size-3 shrink-0"
                                    aria-hidden
                                  />
                                  Sin MAC
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <TruncatedText>{printer.ciudad || "—"}</TruncatedText>
                          </td>
                          <td className="px-5 py-3 tabular-nums">
                            {printer.firmware}
                          </td>
                          {isAdmin ? (
                            <td className="px-5 py-3">
                              <div className="min-w-0">
                                <TruncatedText className="font-medium">
                                  {printer.distributorName || "—"}
                                </TruncatedText>
                                {printer.distributorRif ? (
                                  <p className="truncate text-xs text-muted">
                                    {printer.distributorRif}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                          ) : null}
                          <td className="px-5 py-3">
                            <div className="min-w-0">
                              <TruncatedText className="font-medium">
                                {printer.rifName || "—"}
                              </TruncatedText>
                              {printer.rifCliente ? (
                                <p className="truncate text-xs text-muted">
                                  {printer.rifCliente}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-muted">
                            <ChevronRight className="size-4" aria-hidden />
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
    </ToolsPage>
  );
}
