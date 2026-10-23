import { describe, expect, it } from "vitest";
import {
  isBrokerStatusResponse,
  isStatusResponse,
  isWifiScanResponse,
  normalizeSeniatStatus,
  parseBrokerStatusResponse,
  parseFirmwareStatusResponse,
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

  it("keeps printer network info when SENIAT is offline", () => {
    const result = parseStatusResponse({
      cmd: "StaInf",
      code: 20,
      dataS: JSON.stringify({
        EstatusSeniat: "SIN CONEXION",
        ConexionWifi: "AP_IoT_HomeP",
        direccionIP: "192.168.68.120",
        NroUltZEmit: 2,
        NroUltZTx: 0,
        DiasSinTx: 1,
      }),
    });
    expect(result.success).toBe(true);
    expect(result.seniatStatus).toBe("SIN CONEXION");
    expect(result.additionalInfo?.ipAddress).toBe("192.168.68.120");
    expect(result.additionalInfo?.wifiNetwork).toBe("AP_IoT_HomeP");
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

  it("parses EstCredMqtt1 broker status and extracts MAC from TopicCmd", () => {
    const item = {
      cmd: "StaInf",
      code: 0,
      dataS: JSON.stringify({
        host: "13.51.138.105",
        port: 1883,
        TopicCmd: "/F412FACECEB8/AEG_Fiscal/Integracion/Comando",
        TopicRx: "/F412FACECEB8/AEG_Fiscal/Integracion/Respuesta",
      }),
    };
    expect(isBrokerStatusResponse(item)).toBe(true);
    expect(parseBrokerStatusResponse(item)).toEqual({
      host: "13.51.138.105",
      port: 1883,
      mac: "F4:12:FA:CE:CE:B8",
      topicCmd: "/F412FACECEB8/AEG_Fiscal/Integracion/Comando",
      topicRx: "/F412FACECEB8/AEG_Fiscal/Integracion/Respuesta",
    });
  });

  it("parses firmware version from statFirmSinDNF", () => {
    expect(
      parseFirmwareStatusResponse({
        cmd: "statFirmSinDNF",
        code: 0,
        dataS: "FIRMWARE DEL SISTEMA: 1.1.0",
      }),
    ).toBe("1.1.0");
  });
});
