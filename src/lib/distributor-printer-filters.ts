import type { PrinterStatus } from "@/types/printer";

/** Estatus visibles en el listado de impresoras del distribuidor. */
export const DISTRIBUTOR_PRINTER_STATUSES: PrinterStatus[] = [
  "en_consignacion",
  "asignada",
  "enajenada",
];

export type DistributorPrinterQuickFilter = PrinterStatus | "all";

export const DISTRIBUTOR_PRINTER_QUICK_FILTERS: ReadonlyArray<{
  value: DistributorPrinterQuickFilter;
  label: string;
}> = [
  { value: "all", label: "Todas" },
  { value: "en_consignacion", label: "En consignación" },
  { value: "asignada", label: "Disponibles" },
  { value: "enajenada", label: "Vendidas" },
];

export function isDistributorPrinterQuickFilter(
  value: string,
): value is DistributorPrinterQuickFilter {
  return (
    value === "all" ||
    DISTRIBUTOR_PRINTER_STATUSES.includes(value as PrinterStatus)
  );
}
