import { describe, expect, it } from "vitest";
import {
  ANNUAL_INSPECTION_CREDIT_NOTE_END_OK,
  ANNUAL_INSPECTION_INVOICE_END_OK,
  buildAnnualInspectionTestCreditNoteCommandPayload,
  buildAnnualInspectionTestInvoiceCommandPayload,
  buildSetDateRevOCommandPayload,
  parseStaInfRegistroFromResponse,
  parseTestInvoiceNumberFromResponse,
} from "@/lib/annual-inspection-mqtt-simulator";
import { emptyAnnualInspectionChecklist } from "@/lib/annual-inspection-mqtt-state";

describe("annual-inspection-mqtt-simulator", () => {
  it("builds annual inspection test invoice with single proF line", () => {
    const payload = buildAnnualInspectionTestInvoiceCommandPayload("COLGATE TOTAL");
    expect(payload).toHaveLength(4);
    expect(payload[0]).toMatchObject({
      cmd: "proF",
      data: { pre: 100, cant: 1000, imp: 1, des01: "COLGATE TOTAL" },
    });
    expect(payload[3]).toMatchObject({ cmd: "endFac", data: 1 });
  });

  it("builds credit note command with registro and invoice number", () => {
    const payload = buildAnnualInspectionTestCreditNoteCommandPayload(
      7,
      "GRA0000017",
      "COLGATE TOTAL",
      new Date(2026, 5, 26),
    );
    expect(payload).toHaveLength(9);
    expect(payload[0]).toMatchObject({ cmd: "nroFacNC", data: 7 });
    expect(payload[2]).toMatchObject({ cmd: "conSerNC", data: "GRA0000017" });
    expect(payload[1]).toMatchObject({ cmd: "fechFacNC", data: "26/06/2026" });
  });

  it("builds SetDateRevO from checklist", () => {
    const payload = buildSetDateRevOCommandPayload(
      {
        ...emptyAnnualInspectionChecklist(),
        chkPrecinto: true,
        chkEtiquetaFiscal: true,
      },
      1_782_259_200,
    );
    expect(payload).toMatchObject({
      cmd: "SetDateRevO",
      data: 1_782_259_200,
      inspAO: {
        precinto: "Bien",
        etiqFisc: "Bien",
        impFact: "Defectuoso",
        impNC: "Defectuoso",
        sensPapel: "Defectuoso",
      },
    });
  });

  it("parses StaInf registro and invoice number from simulated responses", () => {
    expect(
      parseStaInfRegistroFromResponse(
        JSON.stringify({ cmd: " StaInf ", code: 0, dataS: "GRA0000017" }),
      ),
    ).toBe("GRA0000017");

    expect(
      parseTestInvoiceNumberFromResponse(
        JSON.stringify([
          { cmd: "proF", code: 0, dataD: 0 },
          { cmd: "subToF", code: 0, dataD: 100 },
          { cmd: "fpaF", code: 0, dataD: 0 },
          { cmd: "endFac", code: 0, dataD: ANNUAL_INSPECTION_INVOICE_END_OK },
        ]),
      ),
    ).toBe(ANNUAL_INSPECTION_INVOICE_END_OK);

    expect(ANNUAL_INSPECTION_CREDIT_NOTE_END_OK).toBe(10);
  });
});
