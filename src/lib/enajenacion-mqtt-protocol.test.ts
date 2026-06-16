import { describe, expect, it } from "vitest";
import {
  buildDnfSuccessResponse,
  buildEnajenacionTestPrinterRequest,
  buildPtrEnajenarPayload,
  buildStaInfSuccessResponse,
  classifyFiscalCommand,
  compactMac,
  ENAJENACION_FLOW_STEPS,
  EnajenacionResponseSteps,
  fiscalCmdServerTopic,
  flowStepById,
  generateTestFiscalSerial,
  isPrinterEligibleForEnajenacionTest,
  isTestFiscalSerial,
  parseManualMacAddress,
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

  it("defines the full enajenacion flow with success criteria", () => {
    expect(ENAJENACION_FLOW_STEPS).toHaveLength(9);
    expect(ENAJENACION_FLOW_STEPS[0]?.id).toBe("request");
    expect(ENAJENACION_FLOW_STEPS.at(-1)?.id).toBe("report-z");
    for (const step of EnajenacionResponseSteps) {
      expect(flowStepById(step.flowStepId)?.id).toBe(step.flowStepId);
    }
  });

  it("parses manual MAC in colon and compact forms", () => {
    expect(parseManualMacAddress("20:6e:f1:88:4c:68")).toEqual({
      ok: true,
      mac: "20:6E:F1:88:4C:68",
    });
    expect(parseManualMacAddress("206EF1884C68")).toEqual({
      ok: true,
      mac: "20:6E:F1:88:4C:68",
    });
    expect(parseManualMacAddress("not-a-mac").ok).toBe(false);
  });

  it("generates test fiscal serials for ephemeral printers", () => {
    expect(generateTestFiscalSerial(1_234_567)).toBe("TST1234567");
    expect(isTestFiscalSerial("TST1234567")).toBe(true);
    expect(isTestFiscalSerial("GRA0000017")).toBe(false);
  });

  it("builds ephemeral printer request from base printer and manual MAC", () => {
    const base = {
      id: 1,
      modelId: 5,
      softwareId: 2,
      clientId: 10,
      distributorId: 3,
      fiscalSerial: "GRA0000017",
      finalSalePrice: 100,
      paid: false,
      installationDate: null,
      versionFirmware: "1.0.0",
      macAddress: "20:6E:F1:88:4C:68",
      status: "asignada",
      deviceType: "interno",
    } as PrinterResponse;

    expect(
      buildEnajenacionTestPrinterRequest(
        base,
        "AA:BB:CC:DD:EE:FF",
        "TST7654321",
      ),
    ).toEqual({
      modelId: 5,
      softwareId: 2,
      clientId: 10,
      distributorId: 3,
      fiscalSerial: "TST7654321",
      finalSalePrice: 100,
      paid: true,
      installationDate: null,
      versionFirmware: "1.0.0",
      macAddress: "AA:BB:CC:DD:EE:FF",
      status: "laboratorio",
      deviceType: "interno",
    });
  });
});
