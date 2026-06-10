import Link from "next/link";
import { Plus } from "lucide-react";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { printerPath } from "@/lib/resource-routes";
import type { PrinterResponse } from "@/types/printer";
import { TableScroll } from "@/components/ui/table-scroll";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";

type DashboardRecentPrintersProps = {
  printers: PrinterResponse[];
  showLink?: boolean;
  variant?: "default" | "distributor";
};

export function DashboardRecentPrinters({
  printers,
  showLink = true,
  variant = "default",
}: DashboardRecentPrintersProps) {
  const isDistributor = variant === "distributor";
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border bg-foreground/[0.02] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="font-semibold text-card-foreground">
            Impresoras recientes
          </h2>
          <p className="text-sm text-muted">
            {isDistributor
              ? "Asignadas y enajenadas en tu inventario"
              : "Últimos equipos registrados"}
          </p>
        </div>
        {showLink && (
          <Link
            href="/printers"
            className="text-sm font-medium text-accent hover:underline"
          >
            Ver todas
          </Link>
        )}
      </div>
      {printers.length === 0 ? (
        <EmptyState
          title="Sin impresoras recientes"
          description={
            isDistributor
              ? "Las impresoras asignadas a tu distribuidora aparecerán aquí."
              : "Registra equipos fiscales para verlos en este listado."
          }
          action={
            showLink ? (
              <Link
                href="/printers"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
              >
                <Plus className="size-4" />
                Ir a impresoras
              </Link>
            ) : undefined
          }
        />
      ) : (
        <TableScroll>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                <th className="px-5 py-3 font-medium">Serial fiscal</th>
                <th className="px-5 py-3 font-medium">Estatus</th>
                <th className="px-5 py-3 font-medium">Pagada</th>
                <th className="px-5 py-3 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody>
              {printers.map((printer) => (
                <ClickableTableRow key={printer.id} href={printerPath(printer.id)}>
                  <td className="px-5 py-3.5 font-mono font-medium text-card-foreground">
                    {printer.fiscalSerial}
                  </td>
                  <td className="px-5 py-3.5">
                    <PrinterStatusBadge status={printer.status} />
                  </td>
                  <td className="px-5 py-3.5 text-muted">
                    {printer.paid ? "Sí" : "No"}
                  </td>
                  <td className="px-5 py-3.5 text-muted">
                    {new Date(printer.createdAt).toLocaleDateString("es", {
                      dateStyle: "short",
                    })}
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
