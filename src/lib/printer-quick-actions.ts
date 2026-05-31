import { isPrinterAssigned, isPrinterUnassigned } from "@/lib/printer-status";

export type PrinterStatusQuickAction = {
  onClick: () => void;
  label: string;
};

export function getPrinterStatusQuickAction(params: {
  status: string;
  canAssign: boolean;
  canDispose: boolean;
  onAssign: () => void;
  onDispose: () => void;
}): PrinterStatusQuickAction | null {
  if (params.canAssign && isPrinterUnassigned(params.status)) {
    return { onClick: params.onAssign, label: "Asignar impresora" };
  }
  if (params.canDispose && isPrinterAssigned(params.status)) {
    return { onClick: params.onDispose, label: "Enajenar impresora" };
  }
  return null;
}
