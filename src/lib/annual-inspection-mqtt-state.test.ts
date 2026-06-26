import { describe, expect, it } from "vitest";
import {
  ANNUAL_INSPECTION_CHECKLIST_ROWS,
  applyFailedTestInvoice,
  applySuccessfulTestInvoice,
  buildAnnualInspectionInspAo,
  canSendAnnualInspectionTestCreditNote,
  createAnnualInspectionMqttFlowState,
  emptyAnnualInspectionChecklist,
} from "./annual-inspection-mqtt-state";

describe("annual-inspection-mqtt-state", () => {
  it("creates flow state with empty checklist", () => {
    const state = createAnnualInspectionMqttFlowState({
      registroImpresora: "GRA0000017",
      fiscalSerial: "GRA0000017",
      printerId: 42,
    });

    expect(state.registroImpresora).toBe("GRA0000017");
    expect(state.numeroFacturaPrueba).toBeNull();
    expect(state.productDescription).toBe("COLGATE TOTAL");
    expect(state.checklist).toEqual(emptyAnnualInspectionChecklist());
  });

  it("defines five checklist rows with optional actions", () => {
    expect(ANNUAL_INSPECTION_CHECKLIST_ROWS).toHaveLength(5);
    expect(ANNUAL_INSPECTION_CHECKLIST_ROWS.map((row) => row.key)).toEqual([
      "chkPrecinto",
      "chkEtiquetaFiscal",
      "chkFactura",
      "chkNotaCredito",
      "chkSensorPapel",
    ]);
  });

  it("maps checklist booleans to inspAO labels", () => {
    expect(
      buildAnnualInspectionInspAo({
        chkPrecinto: true,
        chkEtiquetaFiscal: false,
        chkFactura: true,
        chkNotaCredito: false,
        chkSensorPapel: true,
      }),
    ).toEqual({
      precinto: "Bien",
      etiqFisc: "Violentado",
      impFact: "Bien",
      impNC: "Defectuoso",
      sensPapel: "Bien",
    });
  });

  it("applySuccessfulTestInvoice stores number and checks factura", () => {
    const flow = createAnnualInspectionMqttFlowState({
      registroImpresora: "GRA0000017",
      fiscalSerial: "GRA0000017",
      printerId: 1,
    });

    const next = applySuccessfulTestInvoice(flow, 7);

    expect(next.numeroFacturaPrueba).toBe(7);
    expect(next.checklist.chkFactura).toBe(true);
    expect(next.checklist.chkNotaCredito).toBe(false);
  });

  it("applyFailedTestInvoice clears invoice prerequisites", () => {
    const flow = applySuccessfulTestInvoice(
      createAnnualInspectionMqttFlowState({
        registroImpresora: "GRA0000017",
        fiscalSerial: "GRA0000017",
        printerId: 1,
      }),
      7,
    );
    flow.checklist.chkNotaCredito = true;

    const next = applyFailedTestInvoice(flow);

    expect(next.numeroFacturaPrueba).toBeNull();
    expect(next.checklist.chkFactura).toBe(false);
    expect(next.checklist.chkNotaCredito).toBe(false);
  });

  it("canSendAnnualInspectionTestCreditNote requires invoice number and registro", () => {
    const flow = createAnnualInspectionMqttFlowState({
      registroImpresora: "GRA0000017",
      fiscalSerial: "GRA0000017",
      printerId: 1,
    });

    expect(canSendAnnualInspectionTestCreditNote(flow)).toBe(false);

    const withInvoice = applySuccessfulTestInvoice(flow, 7);
    expect(canSendAnnualInspectionTestCreditNote(withInvoice)).toBe(true);
  });
});
