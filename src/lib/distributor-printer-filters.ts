import type { ToggleTone } from "@/lib/toggle-button-styles";
import type { PrinterStatus } from "@/types/printer";

/** Estatus visibles en el listado de impresoras del distribuidor. */
export const DISTRIBUTOR_PRINTER_STATUSES: PrinterStatus[] = [
  "asignada",
  "enajenada",
];

export type DistributorPrinterQuickFilter = PrinterStatus | "all";

export const DISTRIBUTOR_PRINTER_QUICK_FILTERS: ReadonlyArray<{
  value: DistributorPrinterQuickFilter;
  label: string;
  tone?: ToggleTone;
}> = [
  { value: "all", label: "Todas" },
  { value: "asignada", label: "Disponibles", tone: "emerald" },
  { value: "enajenada", label: "Vendidas", tone: "rose" },
];

export function isDistributorPrinterQuickFilter(
  value: string,
): value is DistributorPrinterQuickFilter {
  return (
    value === "all" ||
    DISTRIBUTOR_PRINTER_STATUSES.includes(value as PrinterStatus)
  );
}
