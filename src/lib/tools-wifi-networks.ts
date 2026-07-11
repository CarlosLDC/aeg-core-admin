import type { ToolsWifiNetwork } from "@/types/tools-mqtt";

const WIFI_CONNECTED_STATUS_PATTERN =
  /EQUIPO\s+SI\s+CONECTADO(?:\s+AP)?/i;
const WIFI_DISCONNECTED_STATUS_PATTERN =
  /EQUIPO\s+NO\s+CONECTADO(?:\s+AP)?/i;

export type ToolsWifiConnectionInfo = {
  connected: boolean | null;
  ssid: string | null;
  label: string;
};

/** Interpreta el campo ConexionWifi de la impresora (SSID o mensaje de estado). */
export function parseToolsWifiConnection(
  value: string | null | undefined,
): ToolsWifiConnectionInfo {
  const raw = value?.trim() ?? "";

  if (!raw || raw === "N/A") {
    return {
      connected: null,
      ssid: null,
      label: "Sin datos",
    };
  }

  if (WIFI_DISCONNECTED_STATUS_PATTERN.test(raw)) {
    return {
      connected: false,
      ssid: null,
      label: "Sin conexión",
    };
  }

  if (WIFI_CONNECTED_STATUS_PATTERN.test(raw)) {
    return {
      connected: true,
      ssid: null,
      label: "Conectada",
    };
  }

  return {
    connected: true,
    ssid: raw,
    label: raw,
  };
}

/** Mensaje genérico de la impresora cuando está conectada pero no reporta el SSID. */
export function isGenericWifiConnectedMessage(
  value: string | null | undefined,
): boolean {
  const connection = parseToolsWifiConnection(value);
  return connection.connected === true && connection.ssid == null;
}

/** Resuelve el SSID a mostrar usando un valor previo cuando el actual es genérico. */
export function resolveToolsWifiDisplayValue(
  current: string | null | undefined,
  fallback: string | null | undefined,
): string | null | undefined {
  if (resolveToolsWifiConnectedSsid(current)) {
    return current;
  }
  const fallbackSsid = resolveToolsWifiConnectedSsid(fallback);
  if (isGenericWifiConnectedMessage(current) && fallbackSsid) {
    return fallbackSsid;
  }
  return current ?? fallback;
}

/** Etiqueta legible para mostrar el estado WiFi en la UI. */
export function formatToolsWifiStatusLine(
  value: string | null | undefined,
  fallbackSsid?: string | null,
): string {
  const resolved = resolveToolsWifiDisplayValue(value, fallbackSsid);
  const connection = parseToolsWifiConnection(resolved);
  if (connection.ssid) {
    return `WiFi: ${connection.ssid}`;
  }
  return `WiFi: ${connection.label}`;
}

/** SSID real conectado, si la impresora lo reporta (no mensajes de estado). */
export function resolveToolsWifiConnectedSsid(
  value: string | null | undefined,
): string {
  return parseToolsWifiConnection(value).ssid ?? "";
}

/** Normaliza redes WiFi: deduplica SSID, conserva la mejor señal y prioriza la red conectada. */
export function normalizeToolsWifiNetworks(
  networks: ToolsWifiNetwork[] | null | undefined,
  connectedSsid?: string,
): ToolsWifiNetwork[] {
  const bySsid = new Map<string, ToolsWifiNetwork>();

  for (const network of networks ?? []) {
    const ssid = network.ssid?.trim();
    if (!ssid) {
      continue;
    }

    const signal = network.signal ?? null;
    const existing = bySsid.get(ssid);
    if (!existing || compareWifiSignal(signal, existing.signal) > 0) {
      bySsid.set(ssid, { ssid, signal });
    }
  }

  const connected = connectedSsid?.trim();
  if (connected && !bySsid.has(connected)) {
    bySsid.set(connected, { ssid: connected, signal: null });
  }

  const sorted = [...bySsid.values()].sort(
    (a, b) => compareWifiSignal(b.signal, a.signal),
  );

  if (!connected) {
    return sorted;
  }

  const connectedIndex = sorted.findIndex((network) => network.ssid === connected);
  if (connectedIndex <= 0) {
    return sorted;
  }

  const [connectedNetwork] = sorted.splice(connectedIndex, 1);
  return [connectedNetwork, ...sorted];
}

function compareWifiSignal(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  return (a ?? Number.NEGATIVE_INFINITY) - (b ?? Number.NEGATIVE_INFINITY);
}
