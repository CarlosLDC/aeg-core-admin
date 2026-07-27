import {
  CMD_DESC_FP,
  CMD_GEN_IMP_REP_Z,
  CMD_GET_REP_Z,
  CMD_IMP_REP_X,
  CMD_PIE_TI_F,
  CMD_REIM_REP,
  CMD_REP_Z,
  CMD_RESET_MF,
  CMD_STA_INF,
  CMD_WIFI_CONF,
  CMD_W_FILE_SPIFF,
  RESET_MF_DATA,
  SPIFF_ACCESS,
  PARAM_FAC_SPIFF_FILE,
  STA_CONEXION_SIN_DNF,
  STA_ENC_FIJ,
  STA_GET_ACC_POI,
  STA_MEDIOS_PAGOS,
  STA_PIE_FIJ,
  STA_ULT_Z_TX_SENI,
  TEST_NOTE_DATE,
  TEST_PRODUCT_DESCRIPTION,
} from "@/modules/tools/serial/tools-serial-constants";
import { parseHeaderFooterLines } from "@/modules/tools/serial/tools-header-footer-payload";

function writeJson(value: unknown): string {
  return JSON.stringify(value);
}

function staInfPayload(status: string): string {
  return writeJson({
    cmd: CMD_STA_INF,
    data: { status },
  });
}

export function buildStatusPayload(): string {
  return staInfPayload(STA_CONEXION_SIN_DNF);
}

export function buildWifiScanPayload(): string {
  return staInfPayload(STA_GET_ACC_POI);
}

export function buildLastTransmittedZPayload(): string {
  return staInfPayload(STA_ULT_Z_TX_SENI);
}

export function buildFormasPagoReadPayload(): string {
  return staInfPayload(STA_MEDIOS_PAGOS);
}

export function buildHeaderReadPayload(): string {
  return staInfPayload(STA_ENC_FIJ);
}

export function buildFooterReadPayload(): string {
  return staInfPayload(STA_PIE_FIJ);
}

export function buildWifiConnectPayload(ssid: string, password: string): string {
  return writeJson({
    cmd: CMD_WIFI_CONF,
    data: { ssid, pass: password },
  });
}

export function buildWifiResetPayload(): string {
  return writeJson({
    cmd: CMD_RESET_MF,
    data: RESET_MF_DATA,
  });
}

export function buildListReportZPayload(): string {
  return writeJson({ cmd: CMD_GET_REP_Z, data: -1 });
}

export function buildGenerateReportZPayload(): string {
  return writeJson({ cmd: CMD_REP_Z, data: 0 });
}

export function buildGetReportZPayload(reportNumber: number): string {
  return writeJson({ cmd: CMD_GET_REP_Z, data: reportNumber });
}

/**
 * Payload de Reporte X.
 * TODO(tools-report-x): SECCIÓN INCOMPLETA — hace falta un comando MQTT nuevo para
 * visualizar el reporte X sin impresión física. `impRepX` (incluso con impFis:0) imprime
 * al generar. Sustituir el modo visualize cuando se confirme el comando definitivo.
 */
export function buildReportXPayload(printPhysically = false): string {
  return writeJson({
    cmd: CMD_IMP_REP_X,
    data: { impFis: printPhysically ? 1 : 0 },
  });
}

export function buildFormasPagoWritePayload(nroFp: number, descripcion: string): string {
  return writeJson({
    cmd: CMD_DESC_FP,
    data: { nroFP: nroFp, descripcion },
  });
}

export function buildHeaderWritePayload(content: string): string {
  const lines = parseHeaderFooterLines(content);
  return writeJson({
    cmd: CMD_W_FILE_SPIFF,
    data: {
      Access: SPIFF_ACCESS,
      nameFile: PARAM_FAC_SPIFF_FILE,
      contenido: { encFacFijo: lines },
    },
  });
}

export function buildFooterWritePayload(content: string): string {
  const lines = parseHeaderFooterLines(content);
  return writeJson({
    cmd: CMD_PIE_TI_F,
    data: lines,
  });
}

export function buildReprintPayload(
  tipoRe: string,
  number: number,
  printPhysically = false,
): string {
  return writeJson({
    cmd: CMD_REIM_REP,
    data: {
      tipoRe,
      nroReg: [number],
      impFis: printPhysically ? 1 : 0,
    },
  });
}

export function mapReprintTipoRe(docType: string | null | undefined): string {
  if (docType == null || docType.trim() === "") {
    return "rFactura";
  }
  const normalized = docType.trim();
  if (normalized.startsWith("r") && normalized.length > 1) {
    return normalized;
  }
  switch (normalized.toUpperCase()) {
    case "FACTURA":
    case "FAC":
      return "rFactura";
    case "NOTA_CREDITO":
    case "NC":
      return "rNotCre";
    case "NOTA_DEBITO":
    case "ND":
      return "rNotDeb";
    case "NO_FISCAL":
    case "NF":
    case "DOCUMENTO-NO-FISCAL":
    case "DOCUMENTO_NO_FISCAL":
      return "rDoNFis";
    case "Z":
    case "REPORTE_Z":
    case "REPZ":
    case "REP_Z":
      return "rReporZ";
    default:
      throw new Error(`Tipo de documento no soportado para reimpresión: ${docType}`);
  }
}

const TEST_PRODUCT = {
  pre: 100,
  cant: 1000,
  imp: 1,
  des01: TEST_PRODUCT_DESCRIPTION,
};

function command(cmd: string, data: unknown): string {
  return writeJson({ cmd, data });
}

function productLine(taxRate: number): Record<string, unknown> {
  return { ...TEST_PRODUCT, imp: taxRate };
}

export function buildTestInvoicePayloads(): string[] {
  const payloads: string[] = [];
  for (let taxRate = 1; taxRate <= 5; taxRate++) {
    payloads.push(command("proF", productLine(taxRate)));
  }
  payloads.push(writeJson({ cmd: "subToF", data: 1, valor: 0 }));
  payloads.push(command("fpaF", { tipo: 1, monto: -1, tasaConv: 0 }));
  payloads.push(command("endFac", 1));
  return payloads;
}

export function buildTestCreditNotePayloads(printerSerial: string): string[] {
  const payloads: string[] = [
    command("nroFacNC", 1),
    command("fechFacNC", TEST_NOTE_DATE),
    command("conSerNC", printerSerial),
    command("rifCiNC", " "),
    command("razSocNC", [" "]),
  ];
  for (let taxRate = 1; taxRate <= 5; taxRate++) {
    payloads.push(command("prodNC", productLine(taxRate)));
  }
  payloads.push(writeJson({ cmd: "endPoNC", data: 1, valor: 0 }));
  payloads.push(command("fpaNC", { tipo: 1, monto: -1, tasaConv: 0 }));
  payloads.push(command("endNC", 1));
  return payloads;
}

export function buildTestDebitNotePayloads(printerSerial: string): string[] {
  const payloads: string[] = [
    command("nroFacND", 1),
    command("fechFacND", TEST_NOTE_DATE),
    command("conSerND", printerSerial),
    command("rifCiND", " "),
    command("razSocND", [" "]),
  ];
  for (let taxRate = 1; taxRate <= 5; taxRate++) {
    payloads.push(command("prodND", productLine(taxRate)));
  }
  payloads.push(writeJson({ cmd: "endPoND", data: 1, valor: 0 }));
  payloads.push(command("fpaND", { tipo: 1, monto: -1, tasaConv: 0 }));
  payloads.push(command("endND", 1));
  return payloads;
}

export function buildTestGenerateZPayloads(): string[] {
  return [command(CMD_GEN_IMP_REP_Z, 1)];
}
