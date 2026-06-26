import { isPrinterAssigned, isPrinterUnassigned } from "@/lib/printer-status";
import { isPrinterPaidForDisposition } from "@/lib/printer-form";
import { isPrinterPendingMqttEnajenacion } from "@/lib/printer-enajenacion-ticket";
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
    if (params.printer != null && isPrinterPendingMqttEnajenacion(params.printer)) {
      return null;
    }
    const paid =
      params.printer != null
        ? isPrinterPaidForDisposition(params.printer)
        : params.paid === true;
    if (!paid) return null;
    return { onClick: params.onDispose, label: "Enajenar impresora" };
  }
  return null;
}
