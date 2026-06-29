import { describe, expect, it } from "vitest";
import {
  applyFailedTestInvoice,
  applySuccessfulTestInvoice,
  canSendAnnualInspectionTestCreditNote,
  checklistFromPersisted,
  checklistToPersisted,
  checklistToSealTampered,
  createAnnualInspectionMqttFlowState,
  formatChecklistItemValue,
  hasPersistedChecklist,
  isPrinterEligibleForAnnualInspectionMqtt,
  sealTamperedToChkPrecinto,
} from "./state";

describe("@aeg/annual-inspection-mqtt state", () => {
  it("requires enajenada printer with client, serial and mac", () => {
    expect(
      isPrinterEligibleForAnnualInspectionMqtt({
        status: "enajenada",
        clientId: 10,
        macAddress: "20:6E:F1:88:4C:68",
        fiscalSerial: "GRA0000017",
      }),
    ).toBe(true);
    expect(
      isPrinterEligibleForAnnualInspectionMqtt({
        status: "asignada",
        clientId: 10,
        macAddress: "20:6E:F1:88:4C:68",
        fiscalSerial: "GRA0000017",
      }),
    ).toBe(false);
    expect(
      isPrinterEligibleForAnnualInspectionMqtt({
        status: "enajenada",
        clientId: null,
        macAddress: "20:6E:F1:88:4C:68",
        fiscalSerial: "GRA0000017",
      }),
    ).toBe(false);
  });

  it("blocks credit note until invoice number exists", () => {
    const flow = createAnnualInspectionMqttFlowState({
      registroImpresora: "GRA0000017",
      fiscalSerial: "GRA0000017",
      printerId: 1,
    });
    expect(canSendAnnualInspectionTestCreditNote(flow)).toBe(false);
    expect(canSendAnnualInspectionTestCreditNote(applySuccessfulTestInvoice(flow, 7))).toBe(
      true,
    );
  });

  it("clears invoice prerequisites on failure", () => {
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

  it("derives sealTampered from checklist precinto", () => {
    expect(checklistToSealTampered({ chkPrecinto: true, chkEtiquetaFiscal: false, chkFactura: false, chkNotaCredito: false, chkSensorPapel: false })).toBe(false);
    expect(checklistToSealTampered({ chkPrecinto: false, chkEtiquetaFiscal: false, chkFactura: false, chkNotaCredito: false, chkSensorPapel: false })).toBe(true);
    expect(sealTamperedToChkPrecinto(true)).toBe(false);
    expect(sealTamperedToChkPrecinto(false)).toBe(true);
  });

  it("round-trips persisted checklist and infers legacy precinto", () => {
    const checklist = {
      chkPrecinto: true,
      chkEtiquetaFiscal: true,
      chkFactura: false,
      chkNotaCredito: false,
      chkSensorPapel: true,
    };
    expect(checklistToPersisted(checklist)).toEqual(checklist);
    expect(checklistFromPersisted({ sealTampered: true }).chkPrecinto).toBe(false);
    expect(hasPersistedChecklist(checklist)).toBe(true);
    expect(hasPersistedChecklist({})).toBe(false);
  });

  it("formats checklist values for display", () => {
    expect(formatChecklistItemValue("chkPrecinto", true)).toBe("Bien");
    expect(formatChecklistItemValue("chkPrecinto", false)).toBe("Violentado");
    expect(formatChecklistItemValue("chkFactura", false)).toBe("Defectuoso");
    expect(formatChecklistItemValue("chkFactura", null)).toBe("—");
  });
});
