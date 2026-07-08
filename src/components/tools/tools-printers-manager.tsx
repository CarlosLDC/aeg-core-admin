"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { PageToolbar, pageToolbarButtonClass } from "@/components/ui/page-toolbar";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableScroll } from "@/components/ui/table-scroll";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useToolsPrinters } from "@/modules/tools/printers/use-tools-printers";
import { toolsPrinterPath } from "@/lib/resource-routes";
import { isDistributorPanelRole } from "@/types/user";

function StatusCounter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function ToolsPrintersManager() {
  const {
    role,
    printers,
    allPrinters,
    loading,
    error,
    query,
    setQuery,
    reload,
    statusCounts,
  } = useToolsPrinters();

  const showCounters = role != null && isDistributorPanelRole(role);

  return (
    <div className="space-y-4">
      {showCounters && !loading && !error && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCounter label="Enajenadas" value={statusCounts.enajenadas} />
          <StatusCounter
            label="No enajenadas"
            value={statusCounts.noEnajenadas}
          />
          <StatusCounter
            label="En consignación"
            value={statusCounts.enConsignacion}
          />
          <StatusCounter label="Sin asignar" value={statusCounts.sinAsignar} />
        </div>
      )}

      <PageToolbar
        actions={
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className={pageToolbarButtonClass}
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

      <DataTableToolbar
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Buscar por serial, MAC, modelo, cliente…"
        resultCount={printers.length}
        totalCount={allPrinters.length}
      />

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted" />
        </div>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void reload()} retrying={loading} />
      )}

      {!loading && !error && allPrinters.length === 0 && (
        <EmptyState
          title="No hay impresoras disponibles"
          description="No se encontraron impresoras en tu alcance operativo."
        />
      )}

      {!loading && !error && allPrinters.length > 0 && printers.length === 0 && (
        <EmptyState
          title="Sin coincidencias"
          description="Prueba con otro término de búsqueda."
          compact
        />
      )}

      {!loading && !error && printers.length > 0 && (
        <TableScroll>
          <table className="min-w-full text-sm">
            <thead className="border-b bg-foreground/[0.03] text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Serial</th>
                <th className="px-4 py-3 font-medium">MAC</th>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Marca</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Firmware</th>
                <th className="px-4 py-3 font-medium">Ubicación</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
              </tr>
            </thead>
            <tbody>
              {printers.map((printer) => (
                <ClickableTableRow
                  key={printer.id}
                  href={toolsPrinterPath(printer.serial)}
                >
                  <td className="px-4 py-3 font-medium">{printer.serial}</td>
                  <td className="px-4 py-3">
                    {printer.macAddress ? (
                      <TruncatedText>{printer.macAddress}</TruncatedText>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-300">
                        Sin MAC
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{printer.modelo}</td>
                  <td className="px-4 py-3">{printer.marca || "—"}</td>
                  <td className="px-4 py-3">{printer.estado}</td>
                  <td className="px-4 py-3">{printer.firmware}</td>
                  <td className="px-4 py-3">{printer.ubicacion}</td>
                  <td className="px-4 py-3">
                    <TruncatedText>
                      {printer.rifName || printer.rifCliente || "—"}
                    </TruncatedText>
                  </td>
                </ClickableTableRow>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </div>
  );
}
