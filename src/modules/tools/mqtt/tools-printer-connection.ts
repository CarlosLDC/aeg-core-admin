import type { ToolsMqttStatusResponse } from "@/types/tools-mqtt";

/** Aligns with backend default `app.mqtt.tools.timeout.status` (15s). */
export const TOOLS_PRINTER_STATUS_TIMEOUT_MS = 15_000;

export const TOOLS_PRINTER_OFFLINE_MESSAGE =
  "Sin conexión con la impresora fiscal. Algunas operaciones remotas no podrán ejecutarse hasta restablecer la comunicación.";

export const TOOLS_PRINTER_STATUS_TIMEOUT_MESSAGE =
  "Tiempo de espera agotado al consultar la impresora fiscal.";

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

export function isToolsPrinterConnectionResolved(
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  if (loading) {
    return false;
  }
  return status != null || error != null;
}

export function areToolsRemoteActionsEnabled(
  mqttReady: boolean,
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  if (!mqttReady) {
    return false;
  }
  if (loading) {
    return false;
  }
  return isToolsPrinterOnline(status, error);
}

export function areToolsRemoteActionsDisabled(
  mqttReady: boolean,
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  return !areToolsRemoteActionsEnabled(mqttReady, loading, status, error);
}

/** @deprecated Use isToolsPrinterConnectionResolved */
export function isToolsPrinterConnectionKnown(
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  return isToolsPrinterConnectionResolved(loading, status, error);
}
