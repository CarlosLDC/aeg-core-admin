import { describe, expect, it } from "vitest";
import {
  isStatusResponse,
  isWifiScanResponse,
  normalizeSeniatStatus,
  parseFormasPagoResponse,
  parseStatusResponse,
  parseWifiScanResponse,
} from "@/modules/tools/serial/tools-response-parser";

describe("tools-response-parser", () => {
  it("normalizes SENIAT status", () => {
    expect(normalizeSeniatStatus("EN LINEA")).toBe("EN LINEA");
    expect(normalizeSeniatStatus("sin conexion")).toBe("SIN CONEXION");
  });

  it("parses StaInf status response", () => {
    const result = parseStatusResponse({
      cmd: "StaInf",
      code: 0,
      dataS: JSON.stringify({
        EstatusSeniat: "EN LINEA",
        ConexionWifi: "AP_Test",
        direccionIP: "192.168.1.10",
        NroUltZEmit: 3,
        NroUltZTx: 2,
        DiasSinTx: 0,
      }),
    });
    expect(result.success).toBe(true);
    expect(result.seniatStatus).toBe("EN LINEA");
    expect(result.additionalInfo?.wifiNetwork).toBe("AP_Test");
  });

  it("detects wifi scan StaInf responses", () => {
    const item = {
      cmd: "StaInf",
      code: 0,
      dataS: '[{"ssid":"AP","rssi":-55}]',
    };
    expect(isWifiScanResponse(item)).toBe(true);
    expect(isStatusResponse(item)).toBe(false);
    expect(parseWifiScanResponse(item)).toEqual([
      { ssid: "AP", signal: -55 },
    ]);
  });

  it("parses formas de pago map keys", () => {
    const items = parseFormasPagoResponse({
      cmd: "StaInf",
      code: 0,
      dataS: '{"[1]Efectivo":"Efectivo","[2]Tarjeta":"Tarjeta"}',
    });
    expect(items).toEqual([
      { nro: 1, descripcion: "Efectivo" },
      { nro: 2, descripcion: "Tarjeta" },
    ]);
  });
});
