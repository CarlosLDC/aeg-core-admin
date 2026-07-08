"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Loader2,
  Printer,
  RefreshCw,
} from "lucide-react";
import { ToolsPrinterStatusBadge } from "@/components/tools/tools-printer-status-badge";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import {
  PageToolbar,
  pageToolbarButtonClass,
} from "@/components/ui/page-toolbar";
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

type ToolsPrinterSortKey = "serial" | "modelo" | "estado" | "cliente" | "firmware";

const TOOLS_PAGE_SIZE = 10;

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

function compareToolsPrinters(
  a: ToolsPrinter,
  b: ToolsPrinter,
  key: ToolsPrinterSortKey,
): number {
  switch (key) {
    case "serial":
      return a.serial.localeCompare(b.serial, "es");
    case "modelo":
      return `${a.marca} ${a.modelo}`.localeCompare(
        `${b.marca} ${b.modelo}`,
        "es",
      );
    case "estado":
      return a.estado.localeCompare(b.estado, "es");
    case "cliente":
      return (a.rifName || a.rifCliente || "").localeCompare(
        b.rifName || b.rifCliente || "",
        "es",
      );
    case "firmware":
      return a.firmware.localeCompare(b.firmware, "es");
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
  const [statusBucket, setStatusBucket] = useState<ToolsStatusBucket>("all");
  const [distributorFilter, setDistributorFilter] =
    useState<DistributorPrinterQuickFilter>("all");
  const [adminStatusFilter, setAdminStatusFilter] = useState<
    PrinterStatus | "all"
  >("all");
  const [sort, setSort] = useState<TableSortState<ToolsPrinterSortKey>>(null);

  const statusFiltered = useMemo(() => {
    if (isDistributor) {
      if (statusBucket !== "all") {
        return filterToolsPrintersByStatus(searchResults, statusBucket);
      }
      if (distributorFilter === "all") return searchResults;
      return searchResults.filter(
        (printer) => printer.status === distributorFilter,
      );
    }

    if (adminStatusFilter === "all") return searchResults;
    return searchResults.filter(
      (printer) => printer.status === adminStatusFilter,
    );
  }, [
    searchResults,
    isDistributor,
    statusBucket,
    distributorFilter,
    adminStatusFilter,
  ]);

  const sortedPrinters = useMemo(() => {
    const comparators: Partial<
      Record<ToolsPrinterSortKey, (a: ToolsPrinter, b: ToolsPrinter) => number>
    > = {
      serial: (a, b) => compareToolsPrinters(a, b, "serial"),
      modelo: (a, b) => compareToolsPrinters(a, b, "modelo"),
      estado: (a, b) => compareToolsPrinters(a, b, "estado"),
      cliente: (a, b) => compareToolsPrinters(a, b, "cliente"),
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
  }

  function handleStatusCounterClick(bucket: ToolsStatusBucket) {
    setStatusBucket((current) => (current === bucket ? "all" : bucket));
    setDistributorFilter("all");
  }

  return (
    <div className="space-y-4">
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
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {missingMacCount === 1
              ? "1 impresora no tiene MAC registrada"
              : `${missingMacCount} impresoras no tienen MAC registrada`}
            . Las operaciones MQTT requieren MAC en la fase 2.
          </span>
        </p>
      )}

      <PageToolbar
        description={
          !loading && !error && allPrinters.length > 0
            ? `${allPrinters.length} impresora${allPrinters.length === 1 ? "" : "s"} en tu alcance operativo`
            : undefined
        }
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
            icon={Printer}
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
              searchPlaceholder="Buscar por serial, MAC, modelo, cliente…"
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
                  <table className="w-full min-w-[960px] text-left text-sm">
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
                          MAC
                        </th>
                        <SortableTableHeader
                          label="Modelo"
                          sortDirection={
                            sort?.key === "modelo" ? sort.direction : null
                          }
                          onToggle={() =>
                            setSort((current) =>
                              toggleTableSort(current, "modelo"),
                            )
                          }
                        />
                        <SortableTableHeader
                          label="Estado"
                          sortDirection={
                            sort?.key === "estado" ? sort.direction : null
                          }
                          onToggle={() =>
                            setSort((current) =>
                              toggleTableSort(current, "estado"),
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
                        <th className="whitespace-nowrap px-5 py-3 font-medium">
                          Ubicación
                        </th>
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
                          <td className="px-5 py-3 font-medium tabular-nums">
                            {printer.serial}
                          </td>
                          <td className="px-5 py-3">
                            {printer.macAddress ? (
                              <TruncatedText className="font-mono text-xs">
                                {printer.macAddress}
                              </TruncatedText>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                                <AlertTriangle
                                  className="size-3 shrink-0"
                                  aria-hidden
                                />
                                Sin MAC
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {printer.modelo}
                              </p>
                              {printer.marca ? (
                                <p className="truncate text-xs text-muted">
                                  {printer.marca}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <ToolsPrinterStatusBadge
                              status={printer.status}
                              label={printer.estado}
                            />
                          </td>
                          <td className="px-5 py-3 tabular-nums">
                            {printer.firmware}
                          </td>
                          <td className="px-5 py-3">
                            <TruncatedText>{printer.ubicacion}</TruncatedText>
                          </td>
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

      {activeStatusBucket != null ? (
        <p className="text-center text-xs text-muted sm:text-left">
          Filtro activo por contador.{" "}
          <button
            type="button"
            onClick={clearStatusFilters}
            className="font-medium text-accent hover:underline"
          >
            Limpiar filtros
          </button>
        </p>
      ) : null}
    </div>
  );
}
