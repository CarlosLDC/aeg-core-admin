import { isPrinterAssigned, isPrinterOnConsignment, isPrinterUnassigned } from "@/lib/printer-status";
import {
  isPrinterPaidForDisposition,
  PRINTER_UNPAID_DISPOSITION_MESSAGE,
} from "@/lib/printer-form";
import {
  isPrinterPendingMqttEnajenacion,
  PRINTER_TICKET_RECONFIGURE_LABEL,
} from "@/lib/printer-enajenacion-ticket";
import type { PrinterResponse } from "@/types/printer";

export type PrinterStatusQuickAction = {
  onClick: () => void;
  label: string;
};

export function getPrinterStatusQuickAction(params: {
  status: string;
  paid?: boolean;
  printer?: PrinterResponse;
  canAssign: boolean;
  canDispose: boolean;
  onAssign: () => void;
  onDispose: () => void;
}): PrinterStatusQuickAction | null {
  if (params.canAssign && isPrinterUnassigned(params.status)) {
    return { onClick: params.onAssign, label: "Asignar impresora" };
  }
  if (params.canDispose && isPrinterAssigned(params.status)) {
    const paid =
      params.printer != null
        ? isPrinterPaidForDisposition(params.printer)
        : params.paid === true;
    if (!paid) return null;
    if (params.printer != null && isPrinterPendingMqttEnajenacion(params.printer)) {
      return {
        onClick: params.onDispose,
        label: PRINTER_TICKET_RECONFIGURE_LABEL,
      };
    }
    return { onClick: params.onDispose, label: "Enajenar impresora" };
  }
  return null;
}

export function getPrinterStatusBadgeTitle(params: {
  status: string;
  printer?: PrinterResponse;
  canDispose: boolean;
}): string | undefined {
  if (!params.canDispose) {
    return undefined;
  }
  if (isPrinterOnConsignment(params.status)) {
    return PRINTER_UNPAID_DISPOSITION_MESSAGE;
  }
  if (!isPrinterAssigned(params.status)) {
    return undefined;
  }
  const paid =
    params.printer != null
      ? isPrinterPaidForDisposition(params.printer)
      : true;
  if (!paid) {
    return PRINTER_UNPAID_DISPOSITION_MESSAGE;
  }
  return undefined;
}
