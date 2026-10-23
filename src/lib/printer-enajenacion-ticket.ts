import { isPrinterAssigned, isPrinterDisposed } from "@/lib/printer-status";
import type { PrinterResponse, PrinterTicketSection } from "@/types/printer";

export const PRINTER_TICKET_RECONFIGURE_LABEL = "Reconfigurar ticket";

export function hasPrinterTicketConfig(
  printer: Pick<PrinterResponse, "header"> &
    Partial<Pick<PrinterResponse, "hasTicketConfig">>,
): boolean {
  if (typeof printer.hasTicketConfig === "boolean") {
    return printer.hasTicketConfig;
  }
  return (printer.header?.lines?.length ?? 0) > 0;
}

export function isPrinterPendingMqttEnajenacion(
  printer: Pick<PrinterResponse, "status" | "header" | "clientId"> &
    Partial<Pick<PrinterResponse, "hasTicketConfig">>,
): boolean {
  return (
    isPrinterAssigned(printer.status) &&
    printer.clientId != null &&
    hasPrinterTicketConfig(printer)
  );
}

export function canReconfigurePrinterTicket(
  printer: Pick<PrinterResponse, "status" | "header" | "clientId"> &
    Partial<Pick<PrinterResponse, "hasTicketConfig">>,
): boolean {
  return (
    isPrinterPendingMqttEnajenacion(printer) ||
    isPrinterDisposed(printer.status)
  );
}

export function formatPrinterTicketSectionJson(
  section: PrinterTicketSection | null | undefined,
): string {
  return JSON.stringify(section ?? { lines: [] }, null, 2);
}
