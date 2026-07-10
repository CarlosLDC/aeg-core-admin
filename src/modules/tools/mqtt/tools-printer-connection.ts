import type { ToolsMqttStatusResponse } from "@/types/tools-mqtt";

export const TOOLS_PRINTER_OFFLINE_MESSAGE =
  "Sin conexión con la impresora fiscal. Algunas operaciones remotas no podrán ejecutarse hasta restablecer la comunicación.";

export function isToolsPrinterOnline(
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  if (error) {
    return false;
  }
  if (!status?.success) {
    return false;
  }
  return status.seniatStatus === "EN LINEA";
}

export function isToolsPrinterConnectionKnown(
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  return !loading || status != null || error != null;
}
