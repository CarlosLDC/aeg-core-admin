import { describe, expect, it } from "vitest";
import {
  buildConfigSpiffsCommandPayload,
  buildCreditNoteCommandPayload,
  buildDnfSuccessResponse,
  buildDnfAlertCommandPayload,
  buildEnajenacionTestPrinterRequest,
  buildCreditNoteSuccessResponse,
  buildFiscalRifCommandPayload,
  buildHeaderCommandPayload,
  buildInvoiceCommandPayload,
  buildInvoiceSuccessResponse,
  buildEnajenacionCommandContextFromClientData,
  buildPrinterSimulationPayload,
  buildPtrEnajenarPayload,
  buildRegistrationStatusCommandPayload,
  buildReportZCommandPayload,
  buildReportZSuccessResponse,
  buildStaInfSuccessResponse,
  classifyFiscalCommand,
  compactMac,
  detectPrinterResponseStep,
  detectServerCommandStep,
  EnajenacionCommandSteps,
  ENAJENACION_FLOW_STEPS,
  EnajenacionResponseSteps,
  filterFiscalMessagesSince,
  findLatestPtrEnajenarReceivedAt,
  fiscalCmdServerTopic,
  fiscalComandoTopic,
  fiscalTopicMatchesMac,
  flowStepById,
  generateTestFiscalSerial,
  isFiscalCmdServerTopic,
  isFiscalComandoTopic,
  isPtrEnajenarPayload,
  isPrinterEligibleForEnajenacionTest,
  isTestFiscalSerial,
  parseManualMacAddress,
  resolveWfileResponseStep,
} from "@/lib/enajenacion-mqtt-protocol";
import type { PrinterResponse } from "@/types/printer";

describe("enajenacion-mqtt-protocol", () => {
  it("normalizes MAC for topics", () => {
    expect(compactMac("20:6e:f1:88:4c:68")).toBe("206EF1884C68");
    expect(fiscalCmdServerTopic("206EF1884C68")).toBe(
      "/206EF1884C68/AEG_Fiscal/Integracion/CmdServer",
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

  it("builds server command payloads, not firmware responses", () => {
    const context = {
      fiscalSerial: "GRA0000017",
      rif: "j315694205",
      businessName: "Cliente Demo C.A.",
      contributorType: "ordinario" as const,
      address: "Av. Principal Edif. Demo Piso 1",
      city: "Caracas",
      state: "Distrito Capital",
      invoiceDate: "2026-06-16",
    };

    expect(buildDnfAlertCommandPayload().at(-1)).toEqual({
      cmd: "endDNF",
      data: "TIEMPO APROXIMADO DE ESPERA 3 MIN",
    });
    expect(buildFiscalRifCommandPayload(context)).toMatchObject({
      cmd: "fiscalAEG",
      data: {
        nameFile: "rifEmp.json",
        contenido: { rifEmp: "J-315694205", nomEmp: "Cliente Demo C.A." },
      },
    });
    expect(buildHeaderCommandPayload(context)).toMatchObject({
      cmd: "wFileSPIFF",
      data: {
        Access: "AeG-1968-2024",
        nameFile: "paramFacSPIFF.json",
        contenido: {
          encFacFijo: [
            "Av. Principal Edif. Demo Piso 1",
            "",
            "Caracas, Distrito Capital",
            "CONTRIBUYENTE ORDINARIO",
          ],
        },
      },
    });
    expect(buildConfigSpiffsCommandPayload()).toMatchObject({
      cmd: "wFileSPIFF",
      data: { nameFile: "configSPIFFS.json" },
    });
    expect(buildRegistrationStatusCommandPayload()).toEqual({
      cmd: "StaInf",
      data: { status: "NroRegMa" },
    });
    expect(buildInvoiceCommandPayload().at(-1)).toEqual({
      cmd: "endFac",
      data: 1,
    });
    expect(buildCreditNoteCommandPayload(context).slice(0, 5)).toEqual([
      { cmd: "nroFacNC", data: 1 },
      { cmd: "fechFacNC", data: "16/06/2026" },
      { cmd: "conSerNC", data: "GRA0000017" },
      { cmd: "rifCiNC", data: "J-315694205" },
      { cmd: "razSocNC", data: ["Cliente Demo C.A."] },
    ]);
    expect(buildReportZCommandPayload()).toEqual({ cmd: "genImpRepZ", data: 1 });
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
      cmd: " StaInf ",
      code: 0,
      dataS: "GRA0000017",
    });
  });

  it("builds invoice success response", () => {
    expect(buildInvoiceSuccessResponse()).toEqual([
      { cmd: "proF", code: 0, dataD: 0 },
      { cmd: "proF", code: 0, dataD: 0 },
      { cmd: "proF", code: 0, dataD: 0 },
      { cmd: "proF", code: 0, dataD: 0 },
      { cmd: "proF", code: 0, dataD: 0 },
      { cmd: "subToF", code: 0, dataD: 555 },
      { cmd: "fpaF", code: 0, dataD: 0 },
      { cmd: "endFac", code: 0, dataD: 8 },
    ]);
  });

  it("builds credit note success response", () => {
    expect(buildCreditNoteSuccessResponse()).toEqual([
      { cmd: "nroFacNC", code: 0, dataD: 0 },
      { cmd: "fechFacNC", code: 0, dataD: 0 },
      { cmd: "conSerNC", code: 0, dataD: 0 },
      { cmd: "rifCiNC", code: 0, dataD: 0 },
      { cmd: "razSocNC", code: 0, dataD: 0 },
      { cmd: "prodNC", code: 0, dataD: 9 },
      { cmd: "prodNC", code: 0, dataD: 9 },
      { cmd: "prodNC", code: 0, dataD: 9 },
      { cmd: "prodNC", code: 0, dataD: 9 },
      { cmd: "prodNC", code: 0, dataD: 9 },
      { cmd: "endPoNC", code: 0, dataD: 555 },
      { cmd: "fpaNC", code: 0, dataD: 0 },
      { cmd: "endNC", code: 0, dataD: 10 },
    ]);
  });

  it("builds report z success response", () => {
    expect(buildReportZSuccessResponse()).toEqual({
      cmd: "genImpRepZ",
      code: 0,
      dataD: 0,
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
    for (const step of EnajenacionCommandSteps) {
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

  it("builds per-step printer simulation payloads for CmdServer", () => {
    const mac = "206EF1884C68";
    const ctx = buildEnajenacionCommandContextFromClientData({
      fiscalSerial: "GRA0000017",
      rif: "J500662998",
      businessName: "INVERSIONES SHOP COMPUTER 2020, C.A.",
      contributorType: "ordinario",
      address: "Av. Principal 123",
      city: "Caracas",
      state: "Distrito Capital",
    });
    const cmdServer = fiscalCmdServerTopic(mac);

    const request = buildPrinterSimulationPayload(
      "request",
      ctx,
      "20:6E:F1:88:4C:68",
      cmdServer,
    );
    expect(request.topic).toBe(cmdServer);
    expect(request.payload).toEqual(
      buildPtrEnajenarPayload("GRA0000017", "20:6E:F1:88:4C:68"),
    );

    const fiscalRif = buildPrinterSimulationPayload(
      "fiscal-rif",
      ctx,
      "20:6E:F1:88:4C:68",
      cmdServer,
    );
    expect(fiscalRif.topic).toBe(cmdServer);
    expect(fiscalRif.payload).toEqual({
      cmd: "fiscalAEG",
      code: 0,
      dataD: 0,
    });

    const dnf = buildPrinterSimulationPayload(
      "dnf",
      ctx,
      "20:6E:F1:88:4C:68",
      cmdServer,
    );
    expect(dnf.payload).toEqual(buildDnfSuccessResponse());
  });

  it("anchors ritual progress to the latest ptrEnajenar", () => {
    const mac = "206EF1884C68";
    const ptr = buildPtrEnajenarPayload("GRA0000017", mac);
    const messages = [
      {
        topic: fiscalCmdServerTopic(mac),
        payload: JSON.stringify(ptr),
        receivedAt: "2026-06-16T22:00:00.000Z",
      },
      {
        topic: fiscalCmdServerTopic(mac),
        payload: JSON.stringify(buildDnfSuccessResponse()),
        receivedAt: "2026-06-16T22:00:05.000Z",
      },
      {
        topic: fiscalCmdServerTopic(mac),
        payload: JSON.stringify(ptr),
        receivedAt: "2026-06-16T22:20:20.000Z",
      },
    ];
    expect(isPtrEnajenarPayload(JSON.stringify(ptr))).toBe(true);
    expect(findLatestPtrEnajenarReceivedAt(messages, mac)).toBe(
      Date.parse("2026-06-16T22:20:20.000Z"),
    );
    const since = filterFiscalMessagesSince(messages, mac, Date.parse("2026-06-16T22:20:20.000Z"));
    expect(since).toHaveLength(1);
    expect(since[0]?.receivedAt).toBe("2026-06-16T22:20:20.000Z");
  });

  it("matches fiscal topics with or without leading slash", () => {
    expect(fiscalTopicMatchesMac("/206EF1884C68/AEG_Fiscal/Integracion/CmdServer", "206EF1884C68")).toBe(
      true,
    );
    expect(fiscalTopicMatchesMac("206EF1884C68/AEG_Fiscal/Integracion/Comando", "206ef1884c68")).toBe(
      true,
    );
    expect(fiscalTopicMatchesMac("/206EF1884C68/AEG_Fiscal/Integracion/Comando", "AA:BB:CC:DD:EE:FF")).toBe(
      false,
    );
    expect(fiscalTopicMatchesMac("aeg/telemetry/device-1", "206EF1884C68")).toBe(false);
    expect(isFiscalCmdServerTopic("/206EF1884C68/AEG_Fiscal/Integracion/CmdServer")).toBe(true);
    expect(isFiscalComandoTopic("/206EF1884C68/AEG_Fiscal/Integracion/Comando")).toBe(true);
  });

  it("detects server comando and printer cmdserver steps", () => {
    const comandoTopic = "/206EF1884C68/AEG_Fiscal/Integracion/Comando";
    const cmdServerTopic = "/206EF1884C68/AEG_Fiscal/Integracion/CmdServer";

    expect(
      detectServerCommandStep(
        comandoTopic,
        JSON.stringify([{ cmd: " aperDNF ", data: "x" }]),
      ),
    ).toBe("dnf");
    expect(
      detectServerCommandStep(
        comandoTopic,
        JSON.stringify({ cmd: "genImpRepZ", data: 1 }),
      ),
    ).toBe("report-z");

    expect(
      detectPrinterResponseStep(
        JSON.stringify({ cmd: "ptrEnajenar", data: { ptrReg: "X" } }),
      ),
    ).toBe("request");
    expect(
      detectPrinterResponseStep(
        JSON.stringify({ cmd: " fiscalAEG ", code: 0 }),
      ),
    ).toBe("fiscal-rif");
    expect(
      detectPrinterResponseStep(
        JSON.stringify({ cmd: " StaInf ", code: 0, dataS: "GRA0000017" }),
      ),
    ).toBe("reg-status");
    expect(
      detectPrinterResponseStep(
        JSON.stringify(buildDnfSuccessResponse()),
      ),
    ).toBe("dnf");

    expect(resolveWfileResponseStep(0)).toBe("header");
    expect(resolveWfileResponseStep(1)).toBe("config");
  });
});
