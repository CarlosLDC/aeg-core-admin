import { describe, expect, it } from "vitest";
import {
  formatToolsWifiStatusLine,
  normalizeToolsWifiNetworks,
  parseToolsWifiConnection,
  resolveToolsWifiConnectedSsid,
} from "./tools-wifi-networks";

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

  it("traduce el mensaje de estado conectado de la impresora", () => {
    expect(
      formatToolsWifiStatusLine("EQUIPO SI CONECTADO AP"),
    ).toBe("WiFi: Conectada");
    expect(parseToolsWifiConnection("EQUIPO SI CONECTADO AP")).toMatchObject({
      connected: true,
      ssid: null,
      label: "Conectada",
    });
  });

  it("traduce el mensaje de estado desconectado de la impresora", () => {
    expect(formatToolsWifiStatusLine("EQUIPO NO CONECTADO AP")).toBe(
      "WiFi: Sin conexión",
    );
  });

  it("muestra el SSID cuando la impresora lo reporta", () => {
    expect(formatToolsWifiStatusLine("AEG-WiFi")).toBe("Red WiFi: AEG-WiFi");
    expect(resolveToolsWifiConnectedSsid("AEG-WiFi")).toBe("AEG-WiFi");
    expect(resolveToolsWifiConnectedSsid("EQUIPO SI CONECTADO AP")).toBe("");
  });
});
