"use client";

import { useMemo, useState } from "react";
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
import {
  DISTRIBUTOR_PRINTER_QUICK_FILTERS,
  type DistributorPrinterQuickFilter,
} from "@/lib/distributor-printer-filters";
import { PRINTER_STATUS_LABELS } from "@/lib/printer-form";
import { filterAllOption } from "@/lib/table-filter-options";
import {
  sortTableRows,
  toggleTableSort,
  type TableSortState,
} from "@/lib/table-sort";
import { toolsPrinterPath } from "@/lib/resource-routes";
import {
  filterToolsPrintersByStatus,
  type PrinterStatusCounts,
  type ToolsStatusBucket,
} from "@/modules/tools/shared/formatters";
import { useToolsPrinters } from "@/modules/tools/printers/use-tools-printers";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import type { PrinterStatus } from "@/types/printer";
import { PRINTER_STATUSES } from "@/types/printer";
import { isDistributorPanelRole } from "@/types/user";
import { cn } from "@/lib/utils";
import {
  ToolsPage,
  ToolsSectionHeading,
} from "@/components/tools/tools-ui";

type ToolsPrinterSortKey =
  | "serial"
  | "ciudad"
  | "cliente"
  | "distribuidor"
  | "firmware";

const TOOLS_PAGE_SIZE = 5;
const DEFAULT_TOOLS_SORT: TableSortState<ToolsPrinterSortKey> = {
  key: "serial",
  direction: "asc",
};

const STATUS_COUNTER_FILTERS: Array<{
  bucket: ToolsStatusBucket;
  label: string;
  countKey: keyof PrinterStatusCounts;
}> = [
  { bucket: "enajenada", label: "Enajenadas", countKey: "enajenadas" },
  { bucket: "no_enajenada", label: "No enajenadas", countKey: "noEnajenadas" },
  {
    bucket: "en_consignacion",
    label: "En consignación",
    countKey: "enConsignacion",
  },
  { bucket: "sin_asignar", label: "Sin asignar", countKey: "sinAsignar" },
];

function StatusCounter({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-xl border px-4 py-3 text-left transition-colors",
        active
          ? "border-accent/40 bg-accent/10 ring-1 ring-accent/20"
          : "border-border bg-card hover:bg-foreground/[0.03]",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </button>
  );
}

function compareStringField(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? "").localeCompare(b ?? "", "es");
}

function compareToolsPrinters(
  a: ToolsPrinter,
  b: ToolsPrinter,
  key: ToolsPrinterSortKey,
): number {
  switch (key) {
    case "serial":
      return compareStringField(a.serial, b.serial);
    case "ciudad":
      return compareStringField(a.ciudad, b.ciudad);
    case "cliente":
      return compareStringField(
        a.rifName || a.rifCliente,
        b.rifName || b.rifCliente,
      );
    case "distribuidor":
      return compareStringField(
        a.distributorName || a.distributorRif,
        b.distributorName || b.distributorRif,
      );
    case "firmware":
      return compareStringField(a.firmware, b.firmware);
    default:
      return 0;
  }
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
    statusCounts,
  } = useToolsPrinters();

  const isDistributor = role != null && isDistributorPanelRole(role);
  const isAdmin = role === "ADMIN";
  const [statusBucket, setStatusBucket] = useState<ToolsStatusBucket>("all");
  const [distributorFilter, setDistributorFilter] =
    useState<DistributorPrinterQuickFilter>("all");
  const [adminStatusFilter, setAdminStatusFilter] = useState<
    PrinterStatus | "all"
  >("all");
  const [missingMacFilter, setMissingMacFilter] = useState(false);
  const [sort, setSort] =
    useState<TableSortState<ToolsPrinterSortKey>>(DEFAULT_TOOLS_SORT);

  const statusFiltered = useMemo(() => {
    let rows = searchResults;

    if (isDistributor) {
      if (statusBucket !== "all") {
        rows = filterToolsPrintersByStatus(rows, statusBucket);
      } else if (distributorFilter !== "all") {
        rows = rows.filter(
          (printer) => printer.status === distributorFilter,
        );
      }
    } else if (adminStatusFilter !== "all") {
      rows = rows.filter((printer) => printer.status === adminStatusFilter);
    }

    if (missingMacFilter) {
      rows = rows.filter((printer) => !printer.macAddress);
    }

    return rows;
  }, [
    searchResults,
    isDistributor,
    statusBucket,
    distributorFilter,
    adminStatusFilter,
    missingMacFilter,
  ]);

  const sortedPrinters = useMemo(() => {
    const comparators: Partial<
      Record<ToolsPrinterSortKey, (a: ToolsPrinter, b: ToolsPrinter) => number>
    > = {
      serial: (a, b) => compareToolsPrinters(a, b, "serial"),
      ciudad: (a, b) => compareToolsPrinters(a, b, "ciudad"),
      cliente: (a, b) => compareToolsPrinters(a, b, "cliente"),
      distribuidor: (a, b) => compareToolsPrinters(a, b, "distribuidor"),
      firmware: (a, b) => compareToolsPrinters(a, b, "firmware"),
    };
    return sortTableRows(statusFiltered, sort, comparators);
  }, [statusFiltered, sort]);

  const pagination = usePagination(sortedPrinters, TOOLS_PAGE_SIZE);
  const { paginatedItems: visiblePrinters } = pagination;

  const missingMacCount = useMemo(
    () => allPrinters.filter((printer) => !printer.macAddress).length,
    [allPrinters],
  );

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

  const activeStatusBucket =
    isDistributor && statusBucket !== "all" ? statusBucket : null;

  function clearStatusFilters() {
    setStatusBucket("all");
    setDistributorFilter("all");
    setAdminStatusFilter("all");
    setMissingMacFilter(false);
  }

  function handleStatusCounterClick(bucket: ToolsStatusBucket) {
    setStatusBucket((current) => (current === bucket ? "all" : bucket));
    setDistributorFilter("all");
  }

  return (
    <ToolsPage>
      {isDistributor && !loading && !error && allPrinters.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STATUS_COUNTER_FILTERS.map((counter) => (
            <StatusCounter
              key={counter.bucket}
              label={counter.label}
              value={statusCounts[counter.countKey]}
              active={statusBucket === counter.bucket}
              onClick={() => handleStatusCounterClick(counter.bucket)}
            />
          ))}
        </div>
      )}

      {!loading && !error && missingMacCount > 0 && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:text-amber-100"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {missingMacCount === 1
                ? "1 impresora no tiene MAC registrada"
                : `${missingMacCount} impresoras no tienen MAC registrada`}
              . Las operaciones remotas requieren MAC en la fase 2.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMissingMacFilter((current) => !current)}
            className={cn(
              pageToolbarButtonClass,
              "shrink-0 border border-amber-500/35 bg-card text-amber-900 hover:bg-amber-500/10 dark:text-amber-100",
              missingMacFilter &&
                "border-amber-600/50 bg-amber-500/15 ring-1 ring-amber-500/25",
            )}
          >
            {missingMacFilter ? "Mostrar todas" : "Ver sin MAC"}
          </button>
        </div>
      )}

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
                    active={
                      distributorFilter === filter.value &&
                      statusBucket === "all"
                    }
                    onClick={() => {
                      setStatusBucket("all");
                      setDistributorFilter(filter.value);
                    }}
                  >
                    {filter.label}
                  </TableQuickFilterButton>
                ))}
              </TableQuickFilters>
            ) : null}

            <DataTableToolbar
              search={query}
              onSearchChange={setQuery}
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
                        <SortableTableHeader
                          label="Ciudad"
                          sortDirection={
                            sort?.key === "ciudad" ? sort.direction : null
                          }
                          onToggle={() =>
                            setSort((current) =>
                              toggleTableSort(current, "ciudad"),
                            )
                          }
                        />
                        <SortableTableHeader
                          label="Firmware"
                          sortDirection={
                            sort?.key === "firmware" ? sort.direction : null
                          }
                          onToggle={() =>
                            setSort((current) =>
                              toggleTableSort(current, "firmware"),
                            )
                          }
                        />
                        {isAdmin ? (
                          <SortableTableHeader
                            label="Distribuidor"
                            sortDirection={
                              sort?.key === "distribuidor"
                                ? sort.direction
                                : null
                            }
                            onToggle={() =>
                              setSort((current) =>
                                toggleTableSort(current, "distribuidor"),
                              )
                            }
                          />
                        ) : null}
                        <SortableTableHeader
                          label="Cliente"
                          sortDirection={
                            sort?.key === "cliente" ? sort.direction : null
                          }
                          onToggle={() =>
                            setSort((current) =>
                              toggleTableSort(current, "cliente"),
                            )
                          }
                        />
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

      {activeStatusBucket != null || missingMacFilter ? (
        <p className="text-center text-xs text-muted sm:text-left">
          {activeStatusBucket != null ? "Filtro activo por contador." : null}
          {activeStatusBucket != null && missingMacFilter ? " " : null}
          {missingMacFilter ? "Mostrando solo impresoras sin MAC." : null}{" "}
          <button
            type="button"
            onClick={clearStatusFilters}
            className="font-medium text-accent hover:underline"
          >
            Limpiar filtros
          </button>
        </p>
      ) : null}
    </ToolsPage>
  );
}
