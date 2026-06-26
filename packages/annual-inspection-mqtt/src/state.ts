import type {
  AnnualInspectionChecklistKey,
  AnnualInspectionChecklistState,
  AnnualInspectionMqttFlowState,
  AnnualInspectionMqttPrinterRef,
} from "./types";

export const ANNUAL_INSPECTION_INSP_AO_OK = "Bien" as const;
export const ANNUAL_INSPECTION_INSP_AO_VIOLATED = "Violentado" as const;
export const ANNUAL_INSPECTION_INSP_AO_DEFECTIVE = "Defectuoso" as const;

export type AnnualInspectionInspAoPayload = {
  precinto: string;
  etiqFisc: string;
  impFact: string;
  impNC: string;
  sensPapel: string;
};

export function buildAnnualInspectionInspAo(
  checklist: AnnualInspectionChecklistState,
): AnnualInspectionInspAoPayload {
  return {
    precinto: checklist.chkPrecinto
      ? ANNUAL_INSPECTION_INSP_AO_OK
      : ANNUAL_INSPECTION_INSP_AO_VIOLATED,
    etiqFisc: checklist.chkEtiquetaFiscal
      ? ANNUAL_INSPECTION_INSP_AO_OK
      : ANNUAL_INSPECTION_INSP_AO_VIOLATED,
    impFact: checklist.chkFactura
      ? ANNUAL_INSPECTION_INSP_AO_OK
      : ANNUAL_INSPECTION_INSP_AO_DEFECTIVE,
    impNC: checklist.chkNotaCredito
      ? ANNUAL_INSPECTION_INSP_AO_OK
      : ANNUAL_INSPECTION_INSP_AO_DEFECTIVE,
    sensPapel: checklist.chkSensorPapel
      ? ANNUAL_INSPECTION_INSP_AO_OK
      : ANNUAL_INSPECTION_INSP_AO_DEFECTIVE,
  };
}

export function venezuelaNaiveUnixTimestamp(nowMs = Date.now()): number {
  return Math.floor(nowMs / 1000) - 4 * 3600;
}

export const ANNUAL_INSPECTION_DEFAULT_PRODUCT = "COLGATE TOTAL";

export const emptyAnnualInspectionChecklist = (): AnnualInspectionChecklistState => ({
  chkPrecinto: false,
  chkEtiquetaFiscal: false,
  chkFactura: false,
  chkNotaCredito: false,
  chkSensorPapel: false,
});

export function createAnnualInspectionMqttFlowState(input: {
  registroImpresora: string;
  fiscalSerial: string;
  printerId: number;
  productDescription?: string;
}): AnnualInspectionMqttFlowState {
  return {
    registroImpresora: input.registroImpresora,
    fiscalSerial: input.fiscalSerial,
    printerId: input.printerId,
    productDescription: input.productDescription ?? ANNUAL_INSPECTION_DEFAULT_PRODUCT,
    numeroFacturaPrueba: null,
    checklist: emptyAnnualInspectionChecklist(),
  };
}

export function applySuccessfulTestInvoice(
  flow: AnnualInspectionMqttFlowState,
  numeroFacturaPrueba: number,
): AnnualInspectionMqttFlowState {
  return {
    ...flow,
    numeroFacturaPrueba,
    checklist: { ...flow.checklist, chkFactura: true },
  };
}

export function applyFailedTestInvoice(
  flow: AnnualInspectionMqttFlowState,
): AnnualInspectionMqttFlowState {
  return {
    ...flow,
    numeroFacturaPrueba: null,
    checklist: {
      ...flow.checklist,
      chkFactura: false,
      chkNotaCredito: false,
    },
  };
}

export function applySuccessfulTestCreditNote(
  flow: AnnualInspectionMqttFlowState,
): AnnualInspectionMqttFlowState {
  return {
    ...flow,
    checklist: { ...flow.checklist, chkNotaCredito: true },
  };
}

export function applyFailedTestCreditNote(
  flow: AnnualInspectionMqttFlowState,
): AnnualInspectionMqttFlowState {
  return {
    ...flow,
    checklist: { ...flow.checklist, chkNotaCredito: false },
  };
}

export function applyProductDescriptionChange(
  flow: AnnualInspectionMqttFlowState,
  productDescription: string,
): AnnualInspectionMqttFlowState {
  if (flow.productDescription === productDescription) return flow;
  return {
    ...flow,
    productDescription,
    numeroFacturaPrueba: null,
    checklist: {
      ...flow.checklist,
      chkFactura: false,
      chkNotaCredito: false,
    },
  };
}

export function canSendAnnualInspectionTestCreditNote(
  flow: AnnualInspectionMqttFlowState,
): boolean {
  return flow.numeroFacturaPrueba != null && flow.registroImpresora.trim().length > 0;
}

export function creditNoteDisabledReason(
  flow: AnnualInspectionMqttFlowState | null,
): string | null {
  if (!flow) return "Inicie el flujo de inspección anual.";
  if (flow.numeroFacturaPrueba == null) {
    return "Disponible después de una factura de prueba exitosa (endFac code: 0).";
  }
  if (!flow.registroImpresora.trim()) {
    return "Disponible después de obtener el registro de la impresora.";
  }
  return null;
}

export function isPrinterEligibleForAnnualInspectionMqtt(
  printer: AnnualInspectionMqttPrinterRef,
): boolean {
  const status = printer.status?.trim().toLowerCase();
  return (
    status === "enajenada" &&
    Boolean(printer.clientId) &&
    Boolean(printer.macAddress?.trim()) &&
    Boolean(printer.fiscalSerial?.trim())
  );
}

export const ANNUAL_INSPECTION_CHECKLIST_ROWS: ReadonlyArray<{
  key: AnnualInspectionChecklistKey;
  label: string;
  action?: "test-invoice" | "test-credit-note";
}> = [
  { key: "chkPrecinto", label: "Estado del Precinto" },
  { key: "chkEtiquetaFiscal", label: "Estado de la Etiqueta Fiscal" },
  { key: "chkFactura", label: "Estado de la Factura", action: "test-invoice" },
  {
    key: "chkNotaCredito",
    label: "Estado de la Nota de Crédito",
    action: "test-credit-note",
  },
  { key: "chkSensorPapel", label: "Estado Sensor de Papel" },
];
