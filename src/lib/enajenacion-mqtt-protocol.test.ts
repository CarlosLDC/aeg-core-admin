import { describe, expect, it } from "vitest";
import {
  buildDnfSuccessResponse,
  buildPtrEnajenarPayload,
  buildStaInfSuccessResponse,
  classifyFiscalCommand,
  compactMac,
  fiscalCmdServerTopic,
  isPrinterEligibleForEnajenacionTest,
} from "@/lib/enajenacion-mqtt-protocol";
import type { PrinterResponse } from "@/types/printer";

describe("enajenacion-mqtt-protocol", () => {
  it("normalizes MAC for topics", () => {
    expect(compactMac("20:6e:f1:88:4c:68")).toBe("206EF1884C68");
    expect(fiscalCmdServerTopic("206EF1884C68")).toBe(
      "206EF1884C68/AEG_Fiscal/Integracion/CmdServer",
    );
  });

  it("builds ptrEnajenar payload", () => {
    expect(
      buildPtrEnajenarPayload("GRA0000017", "206EF1884C68"),
    ).toEqual({
      cmd: "ptrEnajenar",
      data: { ptrReg: "GRA0000017", macAddr: "20:6E:F1:88:4C:68" },
    });
  });

  it("validates DNF response shape", () => {
    const items = buildDnfSuccessResponse();
    expect(items).toHaveLength(11);
    expect(items.at(-1)).toEqual({ cmd: "endDNF", code: 0, dataD: 7 });
  });

  it("classifies DNF command array", () => {
    const payload = JSON.stringify([{ cmd: "aperDNF", data: "x" }]);
    expect(classifyFiscalCommand(payload)).toBe("dnf");
  });

  it("classifies StaInf registration status command", () => {
    const payload = JSON.stringify({
      cmd: "StaInf",
      data: { status: "NroRegMa" },
    });
    expect(classifyFiscalCommand(payload)).toBe("reg_status");
  });

  it("builds StaInf success response with dataS", () => {
    expect(buildStaInfSuccessResponse("GRA0000017")).toEqual({
      cmd: "StaInf",
      code: 0,
      dataS: "GRA0000017",
    });
  });

  it("detects eligible assigned printer", () => {
    const printer = {
      id: 1,
      status: "asignada",
      clientId: 10,
      macAddress: "20:6E:F1:88:4C:68",
      fiscalSerial: "GRA0000017",
    } as PrinterResponse;
    expect(isPrinterEligibleForEnajenacionTest(printer)).toBe(true);
  });

  it("detects eligible laboratorio printer", () => {
    const printer = {
      id: 2,
      status: "laboratorio",
      clientId: 10,
      macAddress: "20:6E:F1:88:4C:69",
      fiscalSerial: "GRA0000018",
    } as PrinterResponse;
    expect(isPrinterEligibleForEnajenacionTest(printer)).toBe(true);
  });

  it("rejects sin_asignar printer for enajenacion test", () => {
    const printer = {
      id: 3,
      status: "sin_asignar",
      clientId: 10,
      macAddress: "20:6E:F1:88:4C:6A",
      fiscalSerial: "GRA0000019",
    } as PrinterResponse;
    expect(isPrinterEligibleForEnajenacionTest(printer)).toBe(false);
  });
});
