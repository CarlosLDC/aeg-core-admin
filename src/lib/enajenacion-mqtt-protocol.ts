import type { PrinterResponse } from "@/types/printer";
import { isPrinterAssigned } from "@/lib/printer-status";

export const DNF_END_OK = 7;
export const INVOICE_END_OK = 8;
export const CREDIT_NOTE_END_OK = 10;
export const SUBTOTAL_DATA_D = 555;
export const PROD_NC_LINE_DATA_D = 9;

export type FiscalResponseItem = {
  cmd: string;
  code: number;
  dataD?: number;
  dataS?: string;
};

export type EnajenacionSimulatorContext = {
  fiscalSerial: string;
};

export type EnajenacionSimulatorStep = {
  id: string;
  label: string;
  delayMs: number;
  buildPayload: (ctx: EnajenacionSimulatorContext) => unknown;
};

export function compactMac(mac: string): string {
  return mac.replace(/:/g, "").toUpperCase();
}

export function colonMac(mac: string): string {
  const compact = compactMac(mac);
  if (compact.length !== 12) {
    return mac.trim().toUpperCase();
  }
  return compact.match(/.{1,2}/g)!.join(":");
}

export function fiscalCmdServerTopic(compactMac: string): string {
  return `${compactMac}/AEG_Fiscal/Integracion/CmdServer`;
}

export function fiscalComandoTopic(compactMac: string): string {
  return `${compactMac}/AEG_Fiscal/Integracion/Comando`;
}

export function fiscalMonitorTopic(compactMac: string): string {
  return `${compactMac}/AEG_Fiscal/Integracion/#`;
}

export function buildPtrEnajenarPayload(
  fiscalSerial: string,
  macWithColons: string,
): Record<string, unknown> {
  return {
    cmd: "ptrEnajenar",
    data: {
      ptrReg: fiscalSerial,
      macAddr: colonMac(macWithColons),
    },
  };
}

function item(cmd: string, dataD = 0): FiscalResponseItem {
  return { cmd, code: 0, dataD };
}

export function buildDnfSuccessResponse(): FiscalResponseItem[] {
  const items: FiscalResponseItem[] = [
    item("aperDNF"),
    item("efeNeDAnJuCeDNF"),
    ...Array.from({ length: 8 }, () => item("efeNoDAnJuCeDNF")),
    { cmd: "endDNF", code: 0, dataD: DNF_END_OK },
  ];
  return items;
}

export function buildFiscalRifSuccessResponse(): FiscalResponseItem {
  return item("fiscalAEG");
}

export function buildWFileSpiffSuccessResponse(): FiscalResponseItem {
  return item("wFileSPIFF");
}

export function buildStaInfSuccessResponse(fiscalSerial: string): FiscalResponseItem {
  return { cmd: "StaInf", code: 0, dataS: fiscalSerial };
}

export function buildInvoiceSuccessResponse(): FiscalResponseItem[] {
  return [
    ...Array.from({ length: 5 }, () => item("proF")),
    { cmd: "subToF", code: 0, dataD: SUBTOTAL_DATA_D },
    item("fpaF"),
    { cmd: "endFac", code: 0, dataD: INVOICE_END_OK },
  ];
}

export function buildCreditNoteSuccessResponse(): FiscalResponseItem[] {
  return [
    item("nroFacNC"),
    item("fechFacNC"),
    item("conSerNC"),
    item("rifCiNC"),
    item("razSocNC"),
    ...Array.from({ length: 5 }, () => ({
      cmd: "prodNC",
      code: 0,
      dataD: PROD_NC_LINE_DATA_D,
    })),
    { cmd: "endPoNC", code: 0, dataD: SUBTOTAL_DATA_D },
    item("fpaNC"),
    { cmd: "endNC", code: 0, dataD: CREDIT_NOTE_END_OK },
  ];
}

export function buildReportZSuccessResponse(): FiscalResponseItem {
  return item("genImpRepZ");
}

export const EnajenacionResponseSteps: EnajenacionSimulatorStep[] = [
  {
    id: "dnf",
    label: "Paso 2a — Respuesta DNF",
    delayMs: 800,
    buildPayload: () => buildDnfSuccessResponse(),
  },
  {
    id: "fiscal-rif",
    label: "Paso 3a — fiscalAEG",
    delayMs: 600,
    buildPayload: () => buildFiscalRifSuccessResponse(),
  },
  {
    id: "header",
    label: "Paso 3b — paramFacSPIFF",
    delayMs: 600,
    buildPayload: () => buildWFileSpiffSuccessResponse(),
  },
  {
    id: "config",
    label: "Paso 3c — configSPIFFS",
    delayMs: 600,
    buildPayload: () => buildWFileSpiffSuccessResponse(),
  },
  {
    id: "reg-status",
    label: "Paso 4 — StaInf (NroRegMa)",
    delayMs: 600,
    buildPayload: ({ fiscalSerial }) => buildStaInfSuccessResponse(fiscalSerial),
  },
  {
    id: "invoice",
    label: "Paso 5 — Factura de prueba",
    delayMs: 800,
    buildPayload: () => buildInvoiceSuccessResponse(),
  },
  {
    id: "credit-note",
    label: "Paso 6 — Nota de crédito",
    delayMs: 800,
    buildPayload: () => buildCreditNoteSuccessResponse(),
  },
  {
    id: "report-z",
    label: "Paso 7 — Reporte Z",
    delayMs: 600,
    buildPayload: () => buildReportZSuccessResponse(),
  },
];

export function isPrinterEligibleForEnajenacionTest(
  printer: PrinterResponse,
): boolean {
  return (
    isPrinterAssigned(printer.status) &&
    Boolean(printer.clientId) &&
    Boolean(printer.macAddress?.trim()) &&
    Boolean(printer.fiscalSerial?.trim())
  );
}

export function classifyFiscalCommand(payload: string): string {
  const data: unknown = JSON.parse(payload);
  if (Array.isArray(data)) {
    const first = data[0] as { cmd?: string } | undefined;
    const cmd = first?.cmd ?? "";
    if (cmd === "aperDNF") return "dnf";
    if (cmd === "proF") return "invoice";
    if (cmd === "nroFacNC") return "credit_note";
    return `array:${cmd}`;
  }
  if (data && typeof data === "object") {
    const obj = data as { cmd?: string; data?: { nameFile?: string } };
    if (obj.cmd === "fiscalAEG") return "fiscal_rif";
    if (obj.cmd === "wFileSPIFF") {
      const name = obj.data?.nameFile ?? "";
      if (name === "paramFacSPIFF.json") return "header";
      if (name === "configSPIFFS.json") return "config";
      return `wfile:${name}`;
    }
    if (obj.cmd === "genImpRepZ") return "report_z";
    if (obj.cmd === "StaInf") return "reg_status";
    return `object:${obj.cmd ?? "unknown"}`;
  }
  return "unknown";
}

export function buildSimulatorResponseForKind(
  kind: string,
  fiscalSerial?: string,
): unknown {
  switch (kind) {
    case "dnf":
      return buildDnfSuccessResponse();
    case "fiscal_rif":
      return buildFiscalRifSuccessResponse();
    case "header":
    case "config":
      return buildWFileSpiffSuccessResponse();
    case "reg_status":
      if (!fiscalSerial?.trim()) {
        throw new Error("StaInf requiere fiscalSerial para la respuesta dataS");
      }
      return buildStaInfSuccessResponse(fiscalSerial.trim());
    case "invoice":
      return buildInvoiceSuccessResponse();
    case "credit_note":
      return buildCreditNoteSuccessResponse();
    case "report_z":
      return buildReportZSuccessResponse();
    default:
      throw new Error(`Comando fiscal no soportado: ${kind}`);
  }
}
