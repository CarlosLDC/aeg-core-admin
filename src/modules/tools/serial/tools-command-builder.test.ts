import { describe, expect, it } from "vitest";
import {
  buildFooterWritePayload,
  buildHeaderWritePayload,
  buildReportXPayload,
  buildReprintPayload,
  buildStatusPayload,
  buildWifiConnectPayload,
} from "@/modules/tools/serial/tools-command-builder";

describe("tools-command-builder", () => {
  it("builds StaInf status payload", () => {
    expect(JSON.parse(buildStatusPayload())).toEqual({
      cmd: "StaInf",
      data: { status: "StaConexionSinDNF" },
    });
  });

  it("builds wifi connect payload with pass field", () => {
    expect(JSON.parse(buildWifiConnectPayload("MiRed", "secret"))).toEqual({
      cmd: "wifiConf",
      data: { ssid: "MiRed", pass: "secret" },
    });
  });

  it("builds reprint payload with impFis flag", () => {
    expect(JSON.parse(buildReprintPayload("rFactura", 12, false))).toEqual({
      cmd: "reimRep",
      data: { tipoRe: "rFactura", nroReg: [12], impFis: 0 },
    });
  });

  it("builds report X payload with impFis flag", () => {
    expect(JSON.parse(buildReportXPayload(false))).toEqual({
      cmd: "impRepX",
      data: { impFis: 0 },
    });
    expect(JSON.parse(buildReportXPayload(true))).toEqual({
      cmd: "impRepX",
      data: { impFis: 1 },
    });
  });

  it("builds header write payload with encFacFijo array", () => {
    const payload = JSON.parse(buildHeaderWritePayload("LINEA 1\nLINEA 2"));
    expect(payload.cmd).toBe("wFileSPIFF");
    expect(payload.data.contenido.encFacFijo).toEqual(["LINEA 1", "LINEA 2"]);
  });

  it("builds footer write payload as line array", () => {
    const payload = JSON.parse(buildFooterWritePayload("PIE 1\nPIE 2"));
    expect(payload.cmd).toBe("pieTiF");
    expect(payload.data).toEqual(["PIE 1", "PIE 2"]);
  });
});
