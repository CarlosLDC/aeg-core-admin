import type { ToolsMqttStatusResponse } from "@/types/tools-mqtt";

/** Aligns with backend default `app.mqtt.tools.timeout.status` (15s). */
export const TOOLS_PRINTER_STATUS_TIMEOUT_MS = 15_000;

export const TOOLS_PRINTER_OFFLINE_MESSAGE =
  "Sin conexión con la impresora fiscal. Algunas operaciones remotas no podrán ejecutarse hasta restablecer la comunicación.";

export const TOOLS_SENIAT_OFFLINE_MESSAGE =
  "Sin conexión con el SENIAT. La impresora responde, pero la transmisión al SENIAT no está disponible hasta restablecer esa conexión.";

export const TOOLS_PRINTER_STATUS_TIMEOUT_MESSAGE =
  "Tiempo de espera agotado al consultar la impresora fiscal.";

export type ToolsConnectionIssue = "none" | "printer" | "seniat";

export function isToolsPrinterReachable(
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  if (error) {
    return false;
  }
  if (!status?.success) {
    return false;
  }
  return status.additionalInfo != null;
}

export function isToolsSeniatOnline(
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  if (!isToolsPrinterReachable(status, error)) {
    return false;
  }
  return status?.seniatStatus === "EN LINEA";
}

/** @deprecated Use isToolsSeniatOnline */
export function isToolsPrinterOnline(
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  return isToolsSeniatOnline(status, error);
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

export function getToolsConnectionIssue(
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): ToolsConnectionIssue {
  if (!isToolsPrinterConnectionResolved(loading, status, error)) {
    return "none";
  }
  if (isToolsSeniatOnline(status, error)) {
    return "none";
  }
  if (isToolsPrinterReachable(status, error)) {
    return "seniat";
  }
  return "printer";
}

export function areToolsRemoteActionsEnabled(
  transportReady: boolean,
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  if (!transportReady) {
    return false;
  }
  if (loading) {
    return false;
  }
  return isToolsPrinterReachable(status, error);
}

export function areToolsSeniatActionsEnabled(
  transportReady: boolean,
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  if (!transportReady) {
    return false;
  }
  if (loading) {
    return false;
  }
  return isToolsSeniatOnline(status, error);
}

export function areToolsRemoteActionsDisabled(
  transportReady: boolean,
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  return !areToolsRemoteActionsEnabled(transportReady, loading, status, error);
}

export function areToolsSeniatActionsDisabled(
  transportReady: boolean,
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  return !areToolsSeniatActionsEnabled(transportReady, loading, status, error);
}

/** @deprecated Use transportReady — kept for mqtt-specific call sites during migration */
export function areToolsRemoteActionsEnabledMqtt(
  mqttReady: boolean,
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  return areToolsRemoteActionsEnabled(mqttReady, loading, status, error);
}

/** @deprecated Use transportReady */
export function areToolsSeniatActionsEnabledMqtt(
  mqttReady: boolean,
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  return areToolsSeniatActionsEnabled(mqttReady, loading, status, error);
}

/** @deprecated Use areToolsRemoteActionsDisabled with transportReady */
export function areToolsRemoteActionsDisabledMqtt(
  mqttReady: boolean,
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  return areToolsRemoteActionsDisabled(mqttReady, loading, status, error);
}

/** @deprecated Use areToolsSeniatActionsDisabled with transportReady */
export function areToolsSeniatActionsDisabledMqtt(
  mqttReady: boolean,
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  return areToolsSeniatActionsDisabled(mqttReady, loading, status, error);
}

/** @deprecated Use isToolsPrinterConnectionResolved */
export function isToolsPrinterConnectionKnown(
  loading: boolean,
  status: ToolsMqttStatusResponse | null,
  error: string | null,
): boolean {
  return isToolsPrinterConnectionResolved(loading, status, error);
}
