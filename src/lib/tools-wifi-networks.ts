import type { ToolsWifiNetwork } from "@/types/tools-mqtt";

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
