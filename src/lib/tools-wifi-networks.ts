import type { ToolsWifiNetwork } from "@/types/tools-mqtt";

/** Normaliza redes WiFi: deduplica SSID y conserva la mejor señal reportada. */
export function normalizeToolsWifiNetworks(
  networks: ToolsWifiNetwork[] | null | undefined,
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

  return [...bySsid.values()].sort(
    (a, b) => compareWifiSignal(b.signal, a.signal),
  );
}

function compareWifiSignal(
  a: number | null | undefined,
  b: number | null | undefined,
): number {
  return (a ?? Number.NEGATIVE_INFINITY) - (b ?? Number.NEGATIVE_INFINITY);
}
