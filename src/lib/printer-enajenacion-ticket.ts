import { isPrinterAssigned } from "@/lib/printer-status";
import type { PrinterResponse, PrinterTicketSection } from "@/types/printer";

export const PRINTER_PENDING_MQTT_LABEL =
  "Pendiente enajenación";

export const PRINTER_TICKET_RECONFIGURE_LABEL = "Reconfigurar ticket";

export function hasPrinterTicketConfig(
  printer: Pick<PrinterResponse, "header">,
): boolean {
  return (printer.header?.lines?.length ?? 0) > 0;
}

export function isPrinterPendingMqttEnajenacion(
  printer: Pick<PrinterResponse, "status" | "header" | "clientId">,
): boolean {
  return (
    isPrinterAssigned(printer.status) &&
    printer.clientId != null &&
    hasPrinterTicketConfig(printer)
  );
}

export function formatPrinterTicketSectionJson(
  section: PrinterTicketSection | null | undefined,
): string {
  return JSON.stringify(section ?? { lines: [] }, null, 2);
}
