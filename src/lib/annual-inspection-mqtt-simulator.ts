import {
  buildRegistrationStatusCommandPayload,
  buildStaInfSuccessResponse,
  type EnajenacionCommandContext,
  type PrinterSimulationPayload,
} from "@/lib/enajenacion-mqtt-protocol";
import { splitInvoiceProductDescriptionLines } from "@/lib/venezuelan-fiscal-invoice";
import {
  ANNUAL_INSPECTION_DEFAULT_PRODUCT,
  buildAnnualInspectionInspAo,
  type AnnualInspectionChecklistState,
  venezuelaNaiveUnixTimestamp,
} from "@/lib/annual-inspection-mqtt-state";

export const ANNUAL_INSPECTION_INVOICE_END_OK = 7;
export const ANNUAL_INSPECTION_CREDIT_NOTE_END_OK = 10;
export const ANNUAL_INSPECTION_NC_RIF = "V00000000";
export const ANNUAL_INSPECTION_NC_RAZ_SOC = "SIN DERECHO A CREDITO FISCAL";

export type AnnualInspectionRitualStepId =
  | "sta-inf"
  | "checklist"
  | "test-invoice"
  | "test-credit-note"
  | "set-date-rev-o";

export type AnnualInspectionSimulatorContext = {
  fiscalSerial: string;
  registroImpresora: string;
  numeroFacturaPrueba: number | null;
  productDescription: string;
  checklist: AnnualInspectionChecklistState;
  commandContext: EnajenacionCommandContext | null;
};

export const ANNUAL_INSPECTION_RITUAL_STEPS = [
  {
    id: "sta-inf",
    step: "1",
    name: "Consulta de registro (StaInf)",
    isRequest: false,
  },
  {
    id: "checklist",
    step: "2",
    name: "Checklist de inspección",
    isRequest: false,
    isChecklist: true,
  },
  {
    id: "test-invoice",
    step: "3",
    name: "Factura de prueba",
    isRequest: false,
  },
  {
    id: "test-credit-note",
    step: "4",
    name: "Nota de crédito de prueba",
    isRequest: false,
  },
  {
    id: "set-date-rev-o",
    step: "5",
    name: "Registro SetDateRevO",
    isRequest: false,
  },
] as const;

function invoiceDateForPayload(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function annualProductDescription(productDescription: string): string {
  const lines = splitInvoiceProductDescriptionLines(
    productDescription,
    ANNUAL_INSPECTION_DEFAULT_PRODUCT,
  );
  return lines[0]?.trim() || ANNUAL_INSPECTION_DEFAULT_PRODUCT;
}

function productLine(
  cmd: "proF" | "prodNC",
  description: string,
): Record<string, unknown> {
  return {
    cmd,
    data: { pre: 100, cant: 1000, imp: 1, des01: description },
  };
}

function fiscalResponseItem(cmd: string, dataD = 0): Record<string, unknown> {
  return { cmd, code: 0, dataD };
}

export function buildAnnualInspectionTestInvoiceCommandPayload(
  productDescription: string,
): Array<Record<string, unknown>> {
  const description = annualProductDescription(productDescription);
  return [
    productLine("proF", description),
    { cmd: "subToF", data: 1, valor: 0 },
    { cmd: "fpaF", data: { tipo: 1, monto: -1, tasaConv: 0 } },
    { cmd: "endFac", data: 1 },
  ];
}

export function buildAnnualInspectionTestCreditNoteCommandPayload(
  numeroFacturaPrueba: number,
  registroImpresora: string,
  productDescription: string,
  invoiceDate = new Date(),
): Array<Record<string, unknown>> {
  const description = annualProductDescription(productDescription);
  return [
    { cmd: "nroFacNC", data: numeroFacturaPrueba },
    { cmd: "fechFacNC", data: invoiceDateForPayload(invoiceDate) },
    { cmd: "conSerNC", data: registroImpresora.trim() },
    { cmd: "rifCiNC", data: ANNUAL_INSPECTION_NC_RIF },
    {
      cmd: "razSocNC",
      data: { razSoc: [ANNUAL_INSPECTION_NC_RAZ_SOC] },
    },
    productLine("prodNC", description),
    { cmd: "endPoNC", data: 1, valor: 0 },
    { cmd: "fpaNC", data: { tipo: 1, monto: -1, tasaConv: 0 } },
    { cmd: "endNC", data: 1 },
  ];
}

export function buildSetDateRevOCommandPayload(
  checklist: AnnualInspectionChecklistState,
  timestampSeconds = venezuelaNaiveUnixTimestamp(),
): Record<string, unknown> {
  const inspAO = buildAnnualInspectionInspAo(checklist);
  return {
    cmd: "SetDateRevO",
    data: timestampSeconds,
    inspAO,
  };
}

export function buildAnnualInspectionTestInvoiceSuccessResponse(): Array<
  Record<string, unknown>
> {
  return [
    fiscalResponseItem("proF"),
    fiscalResponseItem("subToF", 100),
    fiscalResponseItem("fpaF"),
    fiscalResponseItem("endFac", ANNUAL_INSPECTION_INVOICE_END_OK),
  ];
}

export function buildAnnualInspectionTestCreditNoteSuccessResponse(): Array<
  Record<string, unknown>
> {
  return [
    fiscalResponseItem("nroFacNC"),
    fiscalResponseItem("fechFacNC"),
    fiscalResponseItem("conSerNC"),
    fiscalResponseItem("rifCiNC"),
    fiscalResponseItem("razSocNC"),
    fiscalResponseItem("prodNC"),
    fiscalResponseItem("endPoNC"),
    fiscalResponseItem("fpaNC"),
    fiscalResponseItem("endNC", ANNUAL_INSPECTION_CREDIT_NOTE_END_OK),
  ];
}

export function buildSetDateRevOSuccessResponse(): Record<string, unknown> {
  return { cmd: "SetDateRevO", code: 0, dataD: 0 };
}

export function buildAnnualInspectionServerCommandPayload(
  stepId: AnnualInspectionRitualStepId,
  ctx: AnnualInspectionSimulatorContext,
): unknown {
  switch (stepId) {
    case "sta-inf":
      return buildRegistrationStatusCommandPayload();
    case "test-invoice":
      return buildAnnualInspectionTestInvoiceCommandPayload(ctx.productDescription);
    case "test-credit-note":
      if (ctx.numeroFacturaPrueba == null) {
        throw new Error("Falta numeroFacturaPrueba para la nota de crédito.");
      }
      if (!ctx.registroImpresora.trim()) {
        throw new Error("Falta registroImpresora para la nota de crédito.");
      }
      return buildAnnualInspectionTestCreditNoteCommandPayload(
        ctx.numeroFacturaPrueba,
        ctx.registroImpresora,
        ctx.productDescription,
      );
    case "set-date-rev-o":
      return buildSetDateRevOCommandPayload(ctx.checklist);
    default:
      throw new Error(`Paso sin comando MQTT: ${stepId}`);
  }
}

export function buildAnnualInspectionPrinterSimulationPayload(
  stepId: AnnualInspectionRitualStepId,
  ctx: AnnualInspectionSimulatorContext,
  topics: { comando: string; respuesta: string },
): PrinterSimulationPayload {
  let payload: unknown;
  switch (stepId) {
    case "sta-inf":
      payload = buildStaInfSuccessResponse(
        ctx.registroImpresora.trim() || ctx.fiscalSerial.trim(),
      );
      break;
    case "test-invoice":
      payload = buildAnnualInspectionTestInvoiceSuccessResponse();
      break;
    case "test-credit-note":
      payload = buildAnnualInspectionTestCreditNoteSuccessResponse();
      break;
    case "set-date-rev-o":
      payload = buildSetDateRevOSuccessResponse();
      break;
    default:
      throw new Error(`Paso de simulación desconocido: ${stepId}`);
  }
  return { topic: topics.respuesta, payload };
}

export function buildAnnualInspectionServerCommandSimulation(
  stepId: AnnualInspectionRitualStepId,
  ctx: AnnualInspectionSimulatorContext,
  topics: { comando: string; respuesta: string },
): PrinterSimulationPayload {
  return {
    topic: topics.comando,
    payload: buildAnnualInspectionServerCommandPayload(stepId, ctx),
  };
}

export function annualInspectionSimulationButtonLabel(
  stepId: string,
): string {
  return "Simular respuesta OK";
}

export function annualInspectionServerCommandButtonLabel(
  stepId: string,
): string {
  return stepId === "sta-inf"
    ? "Iniciar ritual"
    : "Publicar comando en Comando";
}

export function parseStaInfRegistroFromResponse(payload: string): string | null {
  try {
    const data: unknown = JSON.parse(payload);
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const dataS = (data as { dataS?: unknown }).dataS;
    return typeof dataS === "string" && dataS.trim() ? dataS.trim() : null;
  } catch {
    return null;
  }
}

export function parseTestInvoiceNumberFromResponse(
  payload: string,
): number | null {
  try {
    const data: unknown = JSON.parse(payload);
    if (!Array.isArray(data)) return null;
    for (const item of data) {
      if (
        item &&
        typeof item === "object" &&
        (item as { cmd?: string }).cmd?.trim() === "endFac" &&
        (item as { code?: number }).code === 0
      ) {
        const dataD = (item as { dataD?: unknown }).dataD;
        return typeof dataD === "number" ? dataD : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}
