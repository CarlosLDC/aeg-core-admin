import type { PrinterRequest, PrinterResponse } from "@/types/printer";
import { isPrinterEligibleForAnnualInspectionMqtt } from "@aeg/annual-inspection-mqtt";
import { isPrinterEligibleForMqttEnajenacion } from "@/lib/printer-status";
import {
  INVOICE_PRODUCT_MAX_LINES,
  INVOICE_PRODUCT_MULTI_LINE_MAX_LENGTH,
  INVOICE_PRODUCT_SINGLE_LINE_MAX_LENGTH,
  invoiceProductDescriptionLinesForProf,
  splitInvoiceProductDescriptionLines,
} from "@/lib/venezuelan-fiscal-invoice";
import type { ContributorType } from "@/types/company";

export const DEFAULT_INVOICE_PRODUCT_DESCRIPTION = "PRODUCTO";
export const DEFAULT_TEST_INVOICE_PRODUCT_DESCRIPTION =
  "Producto de prueba - info. técnica";

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
  /** Identificador del paso en {@link ENAJENACION_FLOW_STEPS}. */
  flowStepId: string;
};

export type EnajenacionCommandContext = {
  fiscalSerial: string;
  rif: string;
  businessName: string;
  contributorType: ContributorType;
  address: string;
  city: string;
  state: string;
  invoiceNumber?: number;
  invoiceDate?: string;
  encFacFijoLines?: string[];
  pieFacFijoLines?: string[];
};

export type EnajenacionCommandStep = {
  id: string;
  label: string;
  buildPayload: (ctx: EnajenacionCommandContext) => unknown;
  flowStepId: string;
};

export type EnajenacionFlowStep = {
  id: string;
  step: string;
  name: string;
  direction: "Impresora → servidor" | "Servidor → impresora";
  topic: "CmdServer" | "Comando";
  /** Tópico donde la impresora publica su respuesta (pasos 2–7). */
  responseTopic?: "Respuesta";
  purpose: string;
  successCriteria: string[];
  /** Qué hace el panel de prueba en este paso (si aplica). */
  panelSimulates?: string;
};

/** Ritual completo: paso 1 (solicitud) + pasos 2–7 (orquestación servidor). */
export const ENAJENACION_FLOW_STEPS: EnajenacionFlowStep[] = [
  {
    id: "request",
    step: "1",
    name: "Solicitud de enajenación",
    direction: "Impresora → servidor",
    topic: "CmdServer",
    purpose:
      "Al arrancar, la impresora avisa que aún no está enajenada. AEG Core valida serial fiscal, MAC, cliente, datos fiscales y que no haya otra sesión activa para esa MAC.",
    successCriteria: [
      "Impresora en BD con estatus Asignada o Laboratorio, pagada y con cliente asignado.",
      "ptrReg coincide con el serial fiscal y macAddr con la MAC de la impresora.",
      "El servidor acepta la solicitud y publica el DNF de alerta (paso 2). Si falla una validación, no inicia el ritual.",
    ],
    panelSimulates:
      "Publica ptrEnajenar en CmdServer al pulsar «Iniciar simulación» (sustituye el arranque de la impresora).",
  },
  {
    id: "dnf",
    step: "2",
    name: "DNF de alerta",
    direction: "Servidor → impresora",
    topic: "Comando",
    purpose:
      "Imprime un documento no fiscal que advierte al operador no usar el equipo hasta completar el Reporte Z.",
    successCriteria: [
      "Cada comando del bloque DNF responde con code = 0.",
      "dataD es dinámico (el firmware lo define); no se valida su valor.",
      "Cualquier code ≠ 0 aborta la sesión.",
    ],
    panelSimulates:
      "Envía la respuesta simulada del firmware (aperDNF … endDNF) en Respuesta.",
    responseTopic: "Respuesta",
  },
  {
    id: "fiscal-rif",
    step: "3a",
    name: "RIF y razón social",
    direction: "Servidor → impresora",
    topic: "Comando",
    purpose:
      "Graba rifEmp.json en la impresora con el RIF y la razón social del cliente tomados de AEG Core.",
    successCriteria: [
      "Comando fiscalAEG publicado en Comando.",
      "Respuesta simulada: fiscalAEG con code = 0.",
    ],
    panelSimulates: "Publica { cmd: \"fiscalAEG\", code: 0 } en Respuesta.",
    responseTopic: "Respuesta",
  },
  {
    id: "header",
    step: "3b",
    name: "Encabezado y dirección",
    direction: "Servidor → impresora",
    topic: "Comando",
    purpose:
      "Escribe paramFacSPIFF.json (dirección, ciudad, tipo de contribuyente y pie fijo opcional) vía wFileSPIFF.",
    successCriteria: [
      "wFileSPIFF con nameFile = paramFacSPIFF.json, Access = AeG-1968-2024 y pieFacFijo si está configurado.",
      "Respuesta simulada: wFileSPIFF con code = 0.",
    ],
    panelSimulates: "Publica { cmd: \"wFileSPIFF\", code: 0 } en Respuesta.",
    responseTopic: "Respuesta",
  },
  {
    id: "config",
    step: "3c",
    name: "Impuestos y formas de pago",
    direction: "Servidor → impresora",
    topic: "Comando",
    purpose:
      "Escribe configSPIFFS.json con la plantilla fiscal fija del servidor (tasas, formas de pago).",
    successCriteria: [
      "wFileSPIFF con nameFile = configSPIFFS.json.",
      "Respuesta simulada: wFileSPIFF con code = 0.",
    ],
    panelSimulates: "Publica { cmd: \"wFileSPIFF\", code: 0 } en Respuesta.",
    responseTopic: "Respuesta",
  },
  {
    id: "reg-status",
    step: "4",
    name: "Estatus del registro fiscal",
    direction: "Servidor → impresora",
    topic: "Comando",
    purpose:
      "Consulta StaInf (NroRegMa) para confirmar que el número de registro en la impresora coincide con el serial fiscal.",
    successCriteria: [
      "StaInf publicado en Comando con data.status = NroRegMa.",
      "Respuesta: StaInf con code = 0 y dataS = serial fiscal (ptrReg).",
    ],
    panelSimulates:
      "Publica { cmd: \"StaInf\", code: 0, dataS: \"<serial>\" } en Respuesta.",
    responseTopic: "Respuesta",
  },
  {
    id: "invoice",
    step: "5",
    name: "Factura de prueba",
    direction: "Servidor → impresora",
    topic: "Comando",
    purpose:
      "Emite una factura fiscal de prueba para validar la configuración antes del cierre.",
    successCriteria: [
      "5 × proF, subToF, fpaF y endFac, todos con code = 0.",
      "dataD en cada ítem es dinámico; no se valida su valor.",
    ],
    panelSimulates:
      "Publica el arreglo de respuestas (proF … endFac) en Respuesta.",
    responseTopic: "Respuesta",
  },
  {
    id: "credit-note",
    step: "6",
    name: "Nota de crédito de anulación",
    direction: "Servidor → impresora",
    topic: "Comando",
    purpose:
      "Anula la factura de prueba mediante una nota de crédito fiscal.",
    successCriteria: [
      "13 comandos NC; cada ítem con code = 0.",
      "dataD es dinámico en cada respuesta.",
    ],
    panelSimulates:
      "Publica el arreglo de respuestas (nroFacNC … endNC) en Respuesta.",
    responseTopic: "Respuesta",
  },
  {
    id: "report-z",
    step: "7",
    name: "Reporte Z",
    direction: "Servidor → impresora",
    topic: "Comando",
    purpose:
      "Cierra el ritual fiscal con genImpRepZ. Tras el OK, AEG Core marca la impresora como Enajenada en base de datos.",
    successCriteria: [
      "genImpRepZ con code = 0.",
      "Estado en BD pasa a Enajenada (éxito global del ritual).",
      "Cualquier code ≠ 0 en cualquier paso impide el cambio de estatus.",
    ],
    panelSimulates:
      "Publica { cmd: \"genImpRepZ\", code: 0 } en Respuesta; el panel consulta la BD hasta ver Enajenada.",
    responseTopic: "Respuesta",
  },
];

export const ENAJENACION_GLOBAL_SUCCESS =
  "La impresora queda con estatus Enajenada en AEG Core tras un Reporte Z exitoso. El panel lo comprueba automáticamente al final de la secuencia.";

export function flowStepById(id: string): EnajenacionFlowStep | undefined {
  return ENAJENACION_FLOW_STEPS.find((step) => step.id === id);
}

const MAC_COLON_RE = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i;
const MAC_COMPACT_RE = /^[0-9A-F]{12}$/i;
const TEST_FISCAL_SERIAL_RE = /^TST[0-9]{7}$/;

export function compactMac(mac: string): string {
  return mac.replace(/:/g, "").toUpperCase();
}

export function parseManualMacAddress(input: string):
  | { ok: true; mac: string }
  | { ok: false; error: string } {
  const trimmed = input.trim().toUpperCase();
  if (MAC_COLON_RE.test(trimmed)) {
    return { ok: true, mac: trimmed };
  }
  const compact = compactMac(trimmed);
  if (MAC_COMPACT_RE.test(compact)) {
    return { ok: true, mac: colonMac(compact) };
  }
  return {
    ok: false,
    error: "MAC inválida. Usa AA:BB:CC:DD:EE:FF o 12 caracteres hexadecimales.",
  };
}

export function generateTestFiscalSerial(seed = Date.now()): string {
  const suffix = (seed % 10_000_000).toString().padStart(7, "0");
  return `TST${suffix}`;
}

export function isTestFiscalSerial(fiscalSerial: string): boolean {
  return TEST_FISCAL_SERIAL_RE.test(fiscalSerial.trim().toUpperCase());
}

export function buildEnajenacionTestPrinterRequest(
  base: PrinterResponse,
  macColon: string,
  fiscalSerial: string,
): PrinterRequest {
  if (!base.clientId) {
    throw new Error("La impresora base debe tener cliente asignado.");
  }
  return {
    modelId: base.modelId,
    softwareId: base.softwareId,
    clientId: base.clientId,
    distributorId: base.distributorId,
    fiscalSerial: fiscalSerial.trim().toUpperCase(),
    finalSalePrice: base.finalSalePrice,
    paid: true,
    installationDate: base.installationDate,
    versionFirmware: base.versionFirmware,
    macAddress: macColon,
    status: "laboratorio",
    deviceType: base.deviceType,
  };
}

export function colonMac(mac: string): string {
  const compact = compactMac(mac);
  if (compact.length !== 12) {
    return mac.trim().toUpperCase();
  }
  return compact.match(/.{1,2}/g)!.join(":");
}

export function fiscalCmdServerTopic(compactMac: string): string {
  return `/${compactMac}/AEG_Fiscal/Integracion/CmdServer`;
}

export function fiscalRespuestaTopic(compactMac: string): string {
  return `/${compactMac}/AEG_Fiscal/Integracion/Respuesta`;
}

export function fiscalComandoTopic(compactMac: string): string {
  return `/${compactMac}/AEG_Fiscal/Integracion/Comando`;
}

export function fiscalMonitorTopic(compactMac: string): string {
  return `/${compactMac}/AEG_Fiscal/Integracion/#`;
}

/** Tópicos fiscales pueden llegar con o sin `/` inicial (firmware vs broker). */
export function fiscalTopicMatchesMac(topic: string, mac: string): boolean {
  const match = topic.trim().match(/^\/?([0-9A-Fa-f]{12})\//);
  if (!match) {
    return false;
  }
  return match[1]!.toUpperCase() === compactMac(mac);
}

export function isFiscalCmdServerTopic(topic: string): boolean {
  return topic.trim().endsWith("/AEG_Fiscal/Integracion/CmdServer");
}

export function isFiscalRespuestaTopic(topic: string): boolean {
  return topic.trim().endsWith("/AEG_Fiscal/Integracion/Respuesta");
}

export function isFiscalComandoTopic(topic: string): boolean {
  return topic.trim().endsWith("/AEG_Fiscal/Integracion/Comando");
}

export function parseMessageReceivedAt(receivedAt: string): number | null {
  const at = Date.parse(receivedAt);
  return Number.isNaN(at) ? null : at;
}

export function formatMqttPayloadForDisplay(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return raw;
  }
}

export function mergeMqttMessages(
  ...groups: { topic: string; payload: string; receivedAt: string }[][]
): { topic: string; payload: string; receivedAt: string }[] {
  const byKey = new Map<
    string,
    { topic: string; payload: string; receivedAt: string }
  >();
  for (const group of groups) {
    for (const message of group) {
      byKey.set(
        `${message.topic}\0${message.receivedAt}\0${message.payload}`,
        message,
      );
    }
  }
  return [...byKey.values()].sort(
    (a, b) =>
      (parseMessageReceivedAt(b.receivedAt) ?? 0) -
      (parseMessageReceivedAt(a.receivedAt) ?? 0),
  );
}

export function isPtrEnajenarPayload(payload: string): boolean {
  return detectPrinterResponseStep(payload) === "request";
}

/** Marca de tiempo del ptrEnajenar más reciente para esta MAC (inicio de sesión MQTT). */
export function findLatestPtrEnajenarReceivedAt(
  messages: { topic: string; payload: string; receivedAt: string }[],
  mac: string,
): number | null {
  let latest: number | null = null;
  for (const message of messages) {
    if (!fiscalTopicMatchesMac(message.topic, mac)) continue;
    if (!isFiscalCmdServerTopic(message.topic)) continue;
    if (!isPtrEnajenarPayload(message.payload)) continue;
    const at = parseMessageReceivedAt(message.receivedAt);
    if (at === null) continue;
    if (latest === null || at > latest) {
      latest = at;
    }
  }
  return latest;
}

export function filterFiscalMessagesSince<T extends { topic: string; receivedAt: string }>(
  messages: T[],
  mac: string,
  anchorAt: number,
): T[] {
  return messages.filter((message) => {
    if (!fiscalTopicMatchesMac(message.topic, mac)) return false;
    const at = parseMessageReceivedAt(message.receivedAt);
    return at !== null && at >= anchorAt;
  });
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

function fiscalRif(rif: string): string {
  const trimmed = rif.trim().toUpperCase();
  if (!trimmed || trimmed.includes("-")) return trimmed;
  if (/^[VEJPG][0-9]{7,9}$/.test(trimmed)) {
    return `${trimmed[0]}-${trimmed.slice(1)}`;
  }
  return trimmed;
}

function contributorTypeLine(contributorType: ContributorType): string {
  switch (contributorType) {
    case "especial":
      return "CONTRIBUYENTE ESPECIAL";
    case "formal":
      return "CONTRIBUYENTE FORMAL";
    case "ordinario":
    default:
      return "CONTRIBUYENTE ORDINARIO";
  }
}

function splitAddress(address: string): [string, string] {
  const trimmed = address.trim();
  if (!trimmed) return ["", ""];
  const newline = trimmed.indexOf("\n");
  if (newline >= 0) {
    return [trimmed.slice(0, newline).trim(), trimmed.slice(newline + 1).trim()];
  }
  if (trimmed.length <= 45) return [trimmed, ""];
  const split = trimmed.lastIndexOf(" ", 45);
  const index = split > 0 ? split : 45;
  return [trimmed.slice(0, index).trim(), trimmed.slice(index).trim()];
}

function splitBusinessName(businessName: string): string[] {
  const trimmed = businessName.trim();
  if (!trimmed) return [""];
  if (trimmed.length <= 45) return [trimmed];
  const lines: string[] = [];
  let start = 0;
  while (start < trimmed.length) {
    let end = Math.min(start + 45, trimmed.length);
    if (end < trimmed.length) {
      const space = trimmed.lastIndexOf(" ", end);
      if (space > start) end = space;
    }
    lines.push(trimmed.slice(start, end).trim());
    start = end;
    while (trimmed[start] === " ") start++;
  }
  return lines;
}

function invoiceDateForPayload(raw?: string): string {
  const value = raw?.trim();
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return invoiceDateForPayload();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function productLine(
  cmd: "proF" | "prodNC",
  imp: number,
  description = DEFAULT_INVOICE_PRODUCT_DESCRIPTION,
): Record<string, unknown> {
  return {
    cmd,
    data: {
      pre: 100,
      cant: 1000,
      imp,
      des01: description,
    },
  };
}

export function normalizeInvoiceProductDescription(
  productDescription?: string,
): string {
  return splitInvoiceProductDescriptionLines(
    productDescription,
    DEFAULT_INVOICE_PRODUCT_DESCRIPTION,
  ).join("\n");
}

export function invoiceProductDescriptionLimitLabel(
  productDescription?: string,
): string {
  const lineCount = (productDescription ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
  if (lineCount <= 1) {
    return `Máximo ${INVOICE_PRODUCT_SINGLE_LINE_MAX_LENGTH} caracteres en una sola línea (el precio ocupa el resto del ancho).`;
  }
  return `Máximo ${INVOICE_PRODUCT_MULTI_LINE_MAX_LENGTH} caracteres por línea, hasta ${INVOICE_PRODUCT_MAX_LINES} líneas.`;
}

export function buildDnfAlertCommandPayload(): Array<Record<string, string>> {
  return [
    { cmd: "aperDNF", data: "DOCUMENTO NO FISCAL" },
    { cmd: "efeNeDAnJuCeDNF", data: "***** ALERTA *****" },
    { cmd: "efeNoDAnJuCeDNF", data: "IMPRESORA EN PROCESO" },
    { cmd: "efeNoDAnJuCeDNF", data: "DE ENAJENACION" },
    { cmd: "efeNoDAnJuCeDNF", data: "DURANTE EL PROCESO" },
    { cmd: "efeNoDAnJuCeDNF", data: "DE ENAJENACION" },
    { cmd: "efeNoDAnJuCeDNF", data: "NO PUEDE SER UTILIZADA," },
    { cmd: "efeNoDAnJuCeDNF", data: "DEBE MANTENERSE ENCENDIDA." },
    { cmd: "efeNoDAnJuCeDNF", data: "EL PROCESO TERMINA CUANDO SE" },
    { cmd: "efeNoDAnJuCeDNF", data: "IMPRIMA UN REPORTE Z" },
    { cmd: "endDNF", data: "TIEMPO APROXIMADO DE ESPERA 3 MIN" },
  ];
}

export function buildFiscalRifCommandPayload(
  ctx: EnajenacionCommandContext,
): Record<string, unknown> {
  return {
    cmd: "fiscalAEG",
    data: {
      nameFile: "rifEmp.json",
      Access: "config",
      contenido: {
        tituloSeniat: "SENIAT",
        rifEmp: fiscalRif(ctx.rif),
        nomEmp: ctx.businessName.trim(),
      },
    },
  };
}

export function buildEncFacFijoLines(
  addressLine1: string,
  addressLine2: string,
  cityStateLine: string,
  contributorLine: string,
): string[] {
  const lines = [addressLine1];
  if (addressLine2.trim()) {
    lines.push(addressLine2);
  }
  lines.push(cityStateLine, contributorLine);
  return lines;
}

export function buildHeaderCommandPayload(
  ctx: EnajenacionCommandContext,
): Record<string, unknown> {
  const [addressLine1, addressLine2] = splitAddress(ctx.address);
  const encFacFijo =
    ctx.encFacFijoLines && ctx.encFacFijoLines.length > 0
      ? ctx.encFacFijoLines
      : buildEncFacFijoLines(
          addressLine1,
          addressLine2,
          `${ctx.city.trim()}, ${ctx.state.trim()}`,
          contributorTypeLine(ctx.contributorType),
        );
  const contenido: Record<string, unknown> = { encFacFijo };
  if (ctx.pieFacFijoLines && ctx.pieFacFijoLines.length > 0) {
    contenido.pieFacFijo = ctx.pieFacFijoLines;
  }
  return {
    cmd: "wFileSPIFF",
    data: {
      Access: "AeG-1968-2024",
      nameFile: "paramFacSPIFF.json",
      contenido,
    },
  };
}

export function buildConfigSpiffsCommandPayload(): Record<string, unknown> {
  return {
    cmd: "wFileSPIFF",
    data: {
      nameFile: "configSPIFFS.json",
      contenido: {
        simMonL: "Bs",
        impArt: {
          desc: ["Exonerado", "IVA", "Reducido", "Lujo", "Percibido"],
          abrev: ["(E)", "(G)", "(R)", "(A)", "(P)"],
          valor: [0, 1600, 800, 3100, 0],
          impMontoPtr: [
            "EXENTO (E)",
            "BI G (16.00%)",
            "BI R (8.00%)",
            "BI A (31.00%)",
            "PERCIBIDO",
          ],
          impMontoImp: ["", "IVA G (16.00%)", "IVA R (8.00%)", "IVA A (31.00%)", ""],
        },
        formPago: {
          tituloFormPag: "FORMA DE PAGO",
          desc: [
            "EFECTIVO",
            "T. DEBITO",
            "T. CREDITO",
            "TRANSFERENCIA",
            "PAGO MOVIL",
            "BIOPAGO",
            "EFECTIVO 7",
            "EFECTIVO 8",
            "EFECTIVO 9",
            "EFECTIVO 10",
            "DIVISA 1",
            "DIVISA 2",
            "DIVISA 3",
            "DIVISA 4",
            "DIVISA 5",
            "DIVISA 6",
          ],
          impG: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 300, 300, 300, 300, 300, 300],
          impMontoPtr: [
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "BI IGTF (3.00%)",
            "BI IGTF (3.00%)",
            "BI IGTF (3.00%)",
            "BI IGTF (3.00%)",
            "BI IGTF (3.00%)",
            "BI IGTF (3.00%)",
          ],
          impMontoImp: [
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "IGTF (3.00%)",
            "IGTF (3.00%)",
            "IGTF (3.00%)",
            "IGTF (3.00%)",
            "IGTF (3.00%)",
            "IGTF (3.00%)",
          ],
        },
      },
    },
  };
}

export function buildRegistrationStatusCommandPayload(): Record<string, unknown> {
  return {
    cmd: "StaInf",
    data: { status: "NroRegMa" },
  };
}

export function buildInvoiceCommandPayload(
  productDescription?: string,
): Array<Record<string, unknown>> {
  const descriptionLines = splitInvoiceProductDescriptionLines(
    productDescription,
    DEFAULT_INVOICE_PRODUCT_DESCRIPTION,
  );
  const profDescriptions = invoiceProductDescriptionLinesForProf(descriptionLines);
  return [
    ...profDescriptions.map((description, index) =>
      productLine("proF", index + 1, description),
    ),
    { cmd: "subToF", data: 1, valor: 0 },
    { cmd: "fpaF", data: { tipo: 1, monto: -1, tasaConv: 0 } },
    { cmd: "endFac", data: 1 },
  ];
}

export function buildCreditNoteCommandPayload(
  ctx: EnajenacionCommandContext,
): Array<Record<string, unknown>> {
  return [
    { cmd: "nroFacNC", data: ctx.invoiceNumber ?? 1 },
    { cmd: "fechFacNC", data: invoiceDateForPayload(ctx.invoiceDate) },
    { cmd: "conSerNC", data: ctx.fiscalSerial },
    { cmd: "rifCiNC", data: fiscalRif(ctx.rif) },
    { cmd: "razSocNC", data: splitBusinessName(ctx.businessName) },
    ...Array.from({ length: 5 }, (_, index) =>
      productLine("prodNC", index + 1),
    ),
    { cmd: "endPoNC", data: 1, valor: 0 },
    { cmd: "fpaNC", data: { tipo: 1, monto: -1, tasaConv: 0 } },
    { cmd: "endNC", data: 1 },
  ];
}

export function buildReportZCommandPayload(): Record<string, unknown> {
  return { cmd: "genImpRepZ", data: 1 };
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
  return { cmd: " StaInf ", code: 0, dataS: fiscalSerial };
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
    flowStepId: "dnf",
    label: "Paso 2 — Respuesta DNF",
    delayMs: 800,
    buildPayload: () => buildDnfSuccessResponse(),
  },
  {
    id: "fiscal-rif",
    flowStepId: "fiscal-rif",
    label: "Paso 3a — fiscalAEG",
    delayMs: 600,
    buildPayload: () => buildFiscalRifSuccessResponse(),
  },
  {
    id: "header",
    flowStepId: "header",
    label: "Paso 3b — paramFacSPIFF",
    delayMs: 600,
    buildPayload: () => buildWFileSpiffSuccessResponse(),
  },
  {
    id: "config",
    flowStepId: "config",
    label: "Paso 3c — configSPIFFS",
    delayMs: 600,
    buildPayload: () => buildWFileSpiffSuccessResponse(),
  },
  {
    id: "reg-status",
    flowStepId: "reg-status",
    label: "Paso 4 — StaInf (NroRegMa)",
    delayMs: 600,
    buildPayload: ({ fiscalSerial }) => buildStaInfSuccessResponse(fiscalSerial),
  },
  {
    id: "invoice",
    flowStepId: "invoice",
    label: "Paso 5 — Factura de prueba",
    delayMs: 800,
    buildPayload: () => buildInvoiceSuccessResponse(),
  },
  {
    id: "credit-note",
    flowStepId: "credit-note",
    label: "Paso 6 — Nota de crédito",
    delayMs: 800,
    buildPayload: () => buildCreditNoteSuccessResponse(),
  },
  {
    id: "report-z",
    flowStepId: "report-z",
    label: "Paso 7 — Reporte Z",
    delayMs: 600,
    buildPayload: () => buildReportZSuccessResponse(),
  },
];

export const EnajenacionCommandSteps: EnajenacionCommandStep[] = [
  {
    id: "dnf",
    flowStepId: "dnf",
    label: "Paso 2 — DNF de alerta",
    buildPayload: () => buildDnfAlertCommandPayload(),
  },
  {
    id: "fiscal-rif",
    flowStepId: "fiscal-rif",
    label: "Paso 3a — fiscalAEG",
    buildPayload: (ctx) => buildFiscalRifCommandPayload(ctx),
  },
  {
    id: "header",
    flowStepId: "header",
    label: "Paso 3b — paramFacSPIFF",
    buildPayload: (ctx) => buildHeaderCommandPayload(ctx),
  },
  {
    id: "config",
    flowStepId: "config",
    label: "Paso 3c — configSPIFFS",
    buildPayload: () => buildConfigSpiffsCommandPayload(),
  },
  {
    id: "reg-status",
    flowStepId: "reg-status",
    label: "Paso 4 — StaInf (NroRegMa)",
    buildPayload: () => buildRegistrationStatusCommandPayload(),
  },
  {
    id: "invoice",
    flowStepId: "invoice",
    label: "Paso 5 — Factura de prueba",
    buildPayload: () => buildInvoiceCommandPayload(),
  },
  {
    id: "credit-note",
    flowStepId: "credit-note",
    label: "Paso 6 — Nota de crédito",
    buildPayload: (ctx) => buildCreditNoteCommandPayload(ctx),
  },
  {
    id: "report-z",
    flowStepId: "report-z",
    label: "Paso 7 — Reporte Z",
    buildPayload: () => buildReportZCommandPayload(),
  },
];

export type PrinterSimulationPayload = {
  topic: string;
  payload: unknown;
};

export function buildEnajenacionCommandContextFromClientData(params: {
  fiscalSerial: string;
  rif: string;
  businessName: string;
  contributorType: ContributorType;
  address: string;
  city: string;
  state: string;
  encFacFijoLines?: string[];
  pieFacFijoLines?: string[];
}): EnajenacionCommandContext {
  return {
    fiscalSerial: params.fiscalSerial.trim(),
    rif: params.rif.trim(),
    businessName: params.businessName.trim(),
    contributorType: params.contributorType,
    address: params.address.trim(),
    city: params.city.trim(),
    state: params.state.trim(),
    invoiceNumber: 1,
    encFacFijoLines: params.encFacFijoLines,
    pieFacFijoLines: params.pieFacFijoLines,
  };
}

/** Payload que el panel publica para simular la impresora (CmdServer o Respuesta). */
export function buildPrinterSimulationPayload(
  stepId: string,
  ctx: EnajenacionCommandContext,
  macAddress: string,
  topics: { cmdServer: string; respuesta: string },
): PrinterSimulationPayload {
  if (stepId === "request") {
    return {
      topic: topics.cmdServer,
      payload: buildPtrEnajenarPayload(ctx.fiscalSerial, macAddress),
    };
  }
  const responseStep = EnajenacionResponseSteps.find(
    (step) => step.flowStepId === stepId,
  );
  if (!responseStep) {
    throw new Error(`Paso de simulación desconocido: ${stepId}`);
  }
  const simulatorCtx: EnajenacionSimulatorContext = {
    fiscalSerial: ctx.fiscalSerial,
  };
  return {
    topic: topics.respuesta,
    payload: responseStep.buildPayload(simulatorCtx),
  };
}

export function printerSimulationButtonLabel(stepId: string): string {
  return stepId === "request" ? "Iniciar ritual" : "Simular respuesta OK";
}

export function isPrinterEligibleForEnajenacionTest(
  printer: PrinterResponse,
): boolean {
  return (
    isPrinterEligibleForMqttEnajenacion(printer.status) &&
    Boolean(printer.clientId) &&
    Boolean(printer.macAddress?.trim()) &&
    Boolean(printer.fiscalSerial?.trim())
  );
}

export function isPrinterEligibleForTestInvoice(
  printer: PrinterResponse,
): boolean {
  return isPrinterEligibleForAnnualInspectionMqtt({
    status: printer.status,
    clientId: printer.clientId,
    macAddress: printer.macAddress,
    fiscalSerial: printer.fiscalSerial,
  });
}

export function classifyFiscalCommand(payload: string): string {
  const data: unknown = JSON.parse(payload);
  if (Array.isArray(data)) {
    const first = data[0] as { cmd?: string } | undefined;
    const cmd = first?.cmd?.trim() ?? "";
    if (cmd === "aperDNF") return "dnf";
    if (cmd === "proF") return "invoice";
    if (cmd === "nroFacNC") return "credit_note";
    return `array:${cmd}`;
  }
  if (data && typeof data === "object") {
    const obj = data as { cmd?: string; data?: { nameFile?: string } };
    const cmd = obj.cmd?.trim() ?? "";
    if (cmd === "fiscalAEG") return "fiscal_rif";
    if (cmd === "wFileSPIFF") {
      const name = obj.data?.nameFile ?? "";
      if (name === "paramFacSPIFF.json") return "header";
      if (name === "configSPIFFS.json") return "config";
      return `wfile:${name}`;
    }
    if (cmd === "genImpRepZ") return "report_z";
    if (cmd === "StaInf") return "reg_status";
    return `object:${cmd || "unknown"}`;
  }
  return "unknown";
}

/** Comando que AEG Core publicó en el tópico Comando (servidor → impresora). */
export function detectServerCommandStep(
  topic: string,
  payload: string,
): string | null {
  if (!isFiscalComandoTopic(topic)) {
    return null;
  }
  try {
    const kind = classifyFiscalCommand(payload);
    switch (kind) {
      case "dnf":
        return "dnf";
      case "fiscal_rif":
        return "fiscal-rif";
      case "header":
        return "header";
      case "config":
        return "config";
      case "reg_status":
        return "reg-status";
      case "invoice":
        return "invoice";
      case "credit_note":
        return "credit-note";
      case "report_z":
        return "report-z";
      default:
        return null;
    }
  } catch {
    return null;
  }
}

type PrinterResponseItem = {
  cmd?: string;
  code?: number;
  dataS?: string;
};

/** Respuesta que la impresora publicó en Respuesta (impresora → servidor). */
export function detectPrinterResponseStep(
  payload: string,
  topic?: string,
): string | null {
  if (topic && !isFiscalRespuestaTopic(topic) && !isFiscalCmdServerTopic(topic)) {
    return null;
  }
  if (topic && isFiscalCmdServerTopic(topic)) {
    try {
      const data: unknown = JSON.parse(payload);
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return null;
      }
      const obj = data as PrinterResponseItem;
      return obj.cmd?.trim() === "ptrEnajenar" ? "request" : null;
    } catch {
      return null;
    }
  }
  try {
    const data: unknown = JSON.parse(payload);
    if (Array.isArray(data)) {
      const kind = classifyFiscalCommand(payload);
      if (kind === "dnf") return "dnf";
      if (kind === "invoice") return "invoice";
      if (kind === "credit_note") return "credit-note";
      return null;
    }
    if (!data || typeof data !== "object") {
      return null;
    }
    const obj = data as PrinterResponseItem;
    const cmd = obj.cmd?.trim() ?? "";
    if (cmd === "ptrEnajenar") {
      return topic && isFiscalRespuestaTopic(topic) ? null : "request";
    }
    if (obj.code !== 0) {
      return null;
    }
    if (cmd === "fiscalAEG") return "fiscal-rif";
    if (cmd === "wFileSPIFF") return "wfile_spiff";
    if (cmd === "StaInf") return "reg-status";
    if (cmd === "genImpRepZ") return "report-z";
    return null;
  } catch {
    return null;
  }
}

export function resolveWfileResponseStep(
  wfileResponseIndex: number,
): "header" | "config" | null {
  if (wfileResponseIndex === 0) return "header";
  if (wfileResponseIndex === 1) return "config";
  return null;
}

/** Último comando del servidor en Comando que corresponde al paso del ritual. */
export function findLatestServerCommand<
  T extends { topic: string; payload: string; receivedAt: string },
>(messages: T[], mac: string, stepId: string): T | null {
  let latest: T | null = null;
  let latestAt = -1;
  for (const message of messages) {
    if (!fiscalTopicMatchesMac(message.topic, mac)) continue;
    if (!isFiscalComandoTopic(message.topic)) continue;
    if (detectServerCommandStep(message.topic, message.payload) !== stepId) {
      continue;
    }
    const at = parseMessageReceivedAt(message.receivedAt) ?? 0;
    if (at >= latestAt) {
      latestAt = at;
      latest = message;
    }
  }
  return latest;
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
