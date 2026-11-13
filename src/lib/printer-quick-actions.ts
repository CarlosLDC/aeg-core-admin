import {
  isPrinterAssigned,
  isPrinterOnConsignment,
  isPrinterUnassigned,
} from "@/lib/printer-status";
import {
  isPrinterPaidForDisposition,
  PRINTER_UNPAID_DISPOSITION_MESSAGE,
} from "@/lib/printer-form";
import {
  isPrinterPendingMqttEnajenacion,
  PRINTER_TICKET_RECONFIGURE_LABEL,
} from "@/lib/printer-enajenacion-ticket";
import type { PrinterResponse } from "@/types/printer";

export type PrinterStatusQuickActionKind = "assign" | "dispose" | "reconfigure";

export type PrinterStatusQuickAction = {
  kind: PrinterStatusQuickActionKind;
  onClick: () => void;
  /** Texto corto para el botón inline junto al badge de estatus. */
  buttonLabel: string;
  /** Etiqueta descriptiva para accesibilidad, tooltips y acciones de vista. */
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
    return {
      kind: "assign",
      onClick: params.onAssign,
      buttonLabel: "Asignar",
      label: "Asignar impresora",
    };
  }
  if (params.canDispose && isPrinterAssigned(params.status)) {
    const paid =
      params.printer != null
        ? isPrinterPaidForDisposition(params.printer)
        : params.paid === true;
    if (!paid) return null;
    if (
      params.printer != null &&
      isPrinterPendingMqttEnajenacion(params.printer)
    ) {
      return {
        kind: "reconfigure",
        onClick: params.onDispose,
        buttonLabel: PRINTER_TICKET_RECONFIGURE_LABEL,
        label: PRINTER_TICKET_RECONFIGURE_LABEL,
      };
    }
    return {
      kind: "dispose",
      onClick: params.onDispose,
      buttonLabel: "Enajenar",
      label: "Enajenar impresora",
    };
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
