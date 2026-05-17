import Link from "next/link";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import { formatPrinterPrice } from "@/lib/printer-form";
import type { PrinterResponse } from "@/types/printer";

type DashboardRecentPrintersProps = {
  printers: PrinterResponse[];
  showLink?: boolean;
};

export function DashboardRecentPrinters({
  printers,
  showLink = true,
}: DashboardRecentPrintersProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold text-card-foreground">
            Impresoras recientes
          </h2>
          <p className="text-sm text-muted">Últimos equipos registrados</p>
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
        <p className="py-12 text-center text-sm text-muted">
          No hay impresoras registradas.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-foreground/[0.02] text-muted">
                <th className="px-5 py-3 font-medium">Serial fiscal</th>
                <th className="px-5 py-3 font-medium">Estatus</th>
                <th className="px-5 py-3 font-medium">Precio venta</th>
                <th className="px-5 py-3 font-medium">Pagada</th>
                <th className="px-5 py-3 font-medium">Alta</th>
              </tr>
            </thead>
            <tbody>
              {printers.map((printer) => (
                <tr
                  key={printer.id}
                  className="border-b border-border last:border-0 hover:bg-foreground/[0.02]"
                >
                  <td className="px-5 py-3.5 font-mono font-medium text-card-foreground">
                    {printer.fiscalSerial}
                  </td>
                  <td className="px-5 py-3.5">
                    <PrinterStatusBadge status={printer.status} />
                  </td>
                  <td className="px-5 py-3.5 text-muted">
                    {formatPrinterPrice(printer.finalSalePrice)}
                  </td>
                  <td className="px-5 py-3.5 text-muted">
                    {printer.paid ? "Sí" : "No"}
                  </td>
                  <td className="px-5 py-3.5 text-muted">
                    {new Date(printer.createdAt).toLocaleDateString("es", {
                      dateStyle: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
