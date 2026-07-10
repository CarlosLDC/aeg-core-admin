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

  it("coloca la red conectada primero aunque tenga menor señal", () => {
    expect(
      normalizeToolsWifiNetworks(
        [
          { ssid: "Alta", signal: 90 },
          { ssid: "Conectada", signal: 15 },
        ],
        "Conectada",
      ).map((network) => network.ssid),
    ).toEqual(["Conectada", "Alta"]);
  });

  it("agrega la red conectada si no apareció en el escaneo", () => {
    expect(
      normalizeToolsWifiNetworks([{ ssid: "Otra", signal: 50 }], "MiRed").map(
        (network) => network.ssid,
      ),
    ).toEqual(["MiRed", "Otra"]);
  });
});
