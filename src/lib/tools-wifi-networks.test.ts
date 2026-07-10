import { describe, expect, it } from "vitest";
import { normalizeToolsWifiNetworks } from "./tools-wifi-networks";

describe("normalizeToolsWifiNetworks", () => {
  it("deduplica SSID conservando la mejor señal", () => {
    expect(
      normalizeToolsWifiNetworks([
        { ssid: "Red-A", signal: 44 },
        { ssid: "Red-A", signal: 100 },
        { ssid: "Red-B", signal: 20 },
      ]),
    ).toEqual([
      { ssid: "Red-A", signal: 100 },
      { ssid: "Red-B", signal: 20 },
    ]);
  });

  it("ordena por señal descendente", () => {
    expect(
      normalizeToolsWifiNetworks([
        { ssid: "Baja", signal: 10 },
        { ssid: "Alta", signal: 90 },
      ]).map((network) => network.ssid),
    ).toEqual(["Alta", "Baja"]);
  });
});
