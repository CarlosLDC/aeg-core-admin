import type {
  ToolsFormasPagoItem,
  ToolsMqttAdditionalInfo,
  ToolsMqttStatusResponse,
  ToolsReportZData,
  ToolsTransmitZResponse,
  ToolsWifiNetwork,
} from "@/types/tools-mqtt";
import { CMD_STA_INF } from "@/modules/tools/serial/tools-serial-constants";
import {
  cmdEquals,
  type FiscalMqttResponseItem,
} from "@/modules/tools/serial/tools-fiscal-response";

const FORMA_PAGO_KEY = /^\[(\d+)\](.+)$/;

function textOrNa(node: Record<string, unknown>, field: string): string {
  const value = node[field];
  if (typeof value !== "string" || value.trim() === "") {
    return "N/A";
  }
  return value;
}

function parseStaInfDataNode(dataS: string): Record<string, unknown> | null {
  try {
    let node: unknown = JSON.parse(dataS);
    if (typeof node === "string") {
      const inner = node.trim();
      if (inner.startsWith("{") || inner.startsWith("[")) {
        node = JSON.parse(inner);
      }
    }
    if (node && typeof node === "object" && !Array.isArray(node)) {
      return node as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

export function normalizeSeniatStatus(raw: string | null | undefined): "EN LINEA" | "SIN CONEXION" {
  if (raw == null || raw.trim() === "") {
    return "SIN CONEXION";
  }
  const normalized = raw.trim().replace(/\s+/g, " ");
  if (normalized.toUpperCase() === "EN LINEA") {
    return "EN LINEA";
  }
  const upper = normalized.toUpperCase();
  if (upper.includes("EN LINEA") || upper.includes("ENLINEA")) {
    return "EN LINEA";
  }
  return "SIN CONEXION";
}

function isHexValue(value: string): boolean {
  return /^[0-9A-Fa-f]+$/.test(value.trim());
}

function isJsonArrayOfStrings(value: string): boolean {
  try {
    const node = JSON.parse(value);
    if (!Array.isArray(node) || node.length === 0) {
      return false;
    }
    return node.every((element) => typeof element === "string");
  } catch {
    return false;
  }
}

function isJsonArrayOfObjectsWithField(value: string, field: string): boolean {
  try {
    const node = JSON.parse(value);
    if (!Array.isArray(node) || node.length === 0) {
      return false;
    }
    return node.every(
      (element) =>
        element &&
        typeof element === "object" &&
        !Array.isArray(element) &&
        field in element,
    );
  } catch {
    return false;
  }
}

export function isStatusResponse(item: FiscalMqttResponseItem | null): boolean {
  if (item == null || !cmdEquals(item.cmd, CMD_STA_INF)) {
    return false;
  }
  if (item.dataS == null || item.dataS.trim() === "") {
    return false;
  }
  if (item.dataS.includes("EstatusSeniat")) {
    return true;
  }
  const node = parseStaInfDataNode(item.dataS);
  return node != null && "EstatusSeniat" in node;
}

export function isWifiScanResponse(item: FiscalMqttResponseItem | null): boolean {
  if (item == null || !cmdEquals(item.cmd, CMD_STA_INF)) {
    return false;
  }
  if (item.dataS == null || item.dataS.trim() === "") {
    return false;
  }
  return isJsonArrayOfObjectsWithField(item.dataS, "ssid");
}

export function isFormasPagoResponse(item: FiscalMqttResponseItem | null): boolean {
  if (item == null || !cmdEquals(item.cmd, CMD_STA_INF)) {
    return false;
  }
  if (item.dataS == null || item.dataS.trim() === "") {
    return false;
  }
  const trimmed = item.dataS.trim();
  return trimmed.startsWith("{") && trimmed.includes("[");
}

export function isLastTransmittedZResponse(item: FiscalMqttResponseItem | null): boolean {
  if (item == null || !cmdEquals(item.cmd, CMD_STA_INF)) {
    return false;
  }
  return item.dataS != null && isHexValue(item.dataS);
}

export function isHeaderFooterReadResponse(item: FiscalMqttResponseItem | null): boolean {
  if (item == null || !cmdEquals(item.cmd, CMD_STA_INF)) {
    return false;
  }
  if (item.dataS == null || item.dataS.trim() === "") {
    return false;
  }
  if (
    isStatusResponse(item) ||
    isWifiScanResponse(item) ||
    isFormasPagoResponse(item) ||
    isLastTransmittedZResponse(item) ||
    isBrokerStatusResponse(item)
  ) {
    return false;
  }
  const trimmed = item.dataS.trim();
  return isJsonArrayOfStrings(trimmed) || trimmed.toUpperCase() === "SIN PIE DE TICKET FIJOS";
}

function buildStatusInfoFromNode(
  node: Record<string, unknown>,
): ToolsMqttStatusResponse {
  const seniatStatus = normalizeSeniatStatus(String(node.EstatusSeniat ?? ""));
  const info: ToolsMqttAdditionalInfo = {
    wifiNetwork: textOrNa(node, "ConexionWifi"),
    ipAddress: textOrNa(node, "direccionIP"),
    lastZReport: Number(node.NroUltZEmit ?? 0),
    lastZTransmitted:
      node.NroUltZTx != null && node.NroUltZTx !== ""
        ? Number(node.NroUltZTx)
        : null,
    daysSinceLastTx: Number(node.DiasSinTx ?? 0),
  };
  return { success: true, seniatStatus, additionalInfo: info };
}

function tryParseStatusInfo(dataS: string): ToolsMqttStatusResponse | null {
  const node = parseStaInfDataNode(dataS);
  if (node == null || !("EstatusSeniat" in node)) {
    return null;
  }
  return buildStatusInfoFromNode(node);
}

export function parseStatusResponse(response: FiscalMqttResponseItem): ToolsMqttStatusResponse {
  if (response.dataS != null && response.dataS.trim() !== "") {
    const parsed = tryParseStatusInfo(response.dataS);
    if (parsed != null) {
      return parsed;
    }
  }

  if (response.dataS != null && response.dataS.includes("Impresora")) {
    return { success: true, seniatStatus: "SIN CONEXION", additionalInfo: null };
  }

  const errorMessage =
    response.dataS != null && response.dataS.trim() !== ""
      ? response.dataS
      : "Error al consultar estado";
  return { success: false, message: errorMessage, code: response.code ?? null };
}

function readWifiSignal(entry: Record<string, unknown>): number | null {
  const rssi = entry.rssi;
  if (typeof rssi === "number") {
    return rssi;
  }
  const qos = entry.qos;
  if (typeof qos === "number") {
    return qos;
  }
  return null;
}

export function parseWifiScanResponse(response: FiscalMqttResponseItem): ToolsWifiNetwork[] {
  if (response.code != null && response.code !== 0) {
    throw new Error(`Error de impresora en escaneo WiFi (code: ${response.code})`);
  }
  if (response.dataS == null || response.dataS.trim() === "") {
    throw new Error("La impresora no devolvió redes WiFi.");
  }

  const raw = JSON.parse(response.dataS) as Record<string, unknown>[];
  const networksBySsid = new Map<string, ToolsWifiNetwork>();

  for (const entry of raw) {
    const ssid = entry.ssid;
    if (ssid == null || String(ssid).trim() === "") {
      continue;
    }
    const signal = readWifiSignal(entry);
    const ssidValue = String(ssid);
    const existing = networksBySsid.get(ssidValue);
    if (
      existing == null ||
      (signal ?? Number.MIN_SAFE_INTEGER) > (existing.signal ?? Number.MIN_SAFE_INTEGER)
    ) {
      networksBySsid.set(ssidValue, { ssid: ssidValue, signal });
    }
  }

  return Array.from(networksBySsid.values());
}

export function parseWifiConnectResponse(response: FiscalMqttResponseItem): void {
  if (response.code === 0 && (response.dataS == null || response.dataS.trim() === "")) {
    return;
  }
  const message =
    response.dataS != null && response.dataS.trim() !== ""
      ? response.dataS
      : `Error de conexión WiFi (code: ${response.code})`;
  throw new Error(message);
}

export function parseReportZResponse(response: FiscalMqttResponseItem): ToolsReportZData {
  if (response.code != null && response.code !== 0) {
    throw new Error(`Error de impresora en reporte Z (code: ${response.code})`);
  }
  if (response.dataS == null || response.dataS.trim() === "") {
    throw new Error("La impresora no devolvió datos del reporte Z.");
  }
  const report = JSON.parse(response.dataS) as Record<string, unknown>;
  return { report };
}

export function parseTransmitZResponse(response: FiscalMqttResponseItem): ToolsTransmitZResponse {
  if (response.dataS != null && isHexValue(response.dataS)) {
    const lastZ = Number.parseInt(response.dataS.trim(), 16);
    return { success: true, lastTransmittedZ: lastZ };
  }
  if (
    response.dataS != null &&
    response.dataS.trim() !== "" &&
    !response.dataS.includes("Impresora")
  ) {
    return {
      success: true,
      seniatUnavailable: true,
      message: "SENIAT no responde",
    };
  }
  if (response.code != null && response.code !== 0) {
    throw new Error(response.dataS ?? "Error al transmitir reporte Z");
  }
  throw new Error("No se recibió confirmación de transmisión Z.");
}

export function parseFormasPagoResponse(response: FiscalMqttResponseItem): ToolsFormasPagoItem[] {
  if (response.code == null || response.code !== 0 || response.dataS == null) {
    throw new Error(`Error de impresora (code: ${response.code})`);
  }
  const raw = JSON.parse(response.dataS) as Record<string, string>;
  const items: ToolsFormasPagoItem[] = [];
  for (const [key, value] of Object.entries(raw)) {
    const match = FORMA_PAGO_KEY.exec(key);
    if (match) {
      items.push({ nro: Number.parseInt(match[1], 10), descripcion: match[2] });
    }
  }
  return items;
}

export function parseSimpleAck(response: FiscalMqttResponseItem, defaultError: string): void {
  if (response.code === 0 && (response.dataS == null || response.dataS.trim() === "")) {
    return;
  }
  const message =
    response.dataS != null && response.dataS.trim() !== ""
      ? response.dataS
      : `${defaultError} (code: ${response.code})`;
  throw new Error(message);
}

export function parseHeaderFooterResponse(response: FiscalMqttResponseItem): string {
  if (response.code != null && response.code !== 0) {
    throw new Error(`Error de impresora (code: ${response.code})`);
  }
  if (response.dataS == null) {
    return "";
  }
  const dataS = response.dataS.trim();
  if (dataS === "") {
    return "";
  }
  if (dataS.toUpperCase() === "SIN PIE DE TICKET FIJOS") {
    return "";
  }
  if (isJsonArrayOfStrings(dataS)) {
    const lines = JSON.parse(dataS) as string[];
    return lines.join("\n");
  }
  return response.dataS;
}

export function parseReprintChunks(chunks: string[]): string {
  return chunks.join("").trim();
}

export type ResponseMatcher = (item: FiscalMqttResponseItem) => boolean;

export type UsbBrokerStatusInfo = {
  host: string;
  port: number | null;
  mac: string | null;
  topicCmd: string | null;
  topicRx: string | null;
};

const COMPACT_MAC_IN_TOPIC = /\/?([0-9A-Fa-f]{12})(?:\/|$)/;
const COLON_MAC_PATTERN = /\b([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})\b/;
const FIRMWARE_VERSION_PATTERN = /(\d+(?:\.\d+)+)\s*$/;

function formatColonMacFromCompact(compact: string): string {
  const upper = compact.trim().toUpperCase();
  return upper.match(/.{1,2}/g)?.join(":") ?? upper;
}

function extractMacFromNode(node: Record<string, unknown>): string | null {
  for (const key of ["macAddr", "mac", "MacAddress", "direccionMAC"]) {
    const raw = node[key];
    if (typeof raw === "string" && raw.trim() !== "") {
      const colonMatch = COLON_MAC_PATTERN.exec(raw);
      if (colonMatch) return colonMatch[1].toUpperCase();
      const compact = raw.replace(/[^0-9A-Fa-f]/g, "");
      if (compact.length === 12) return formatColonMacFromCompact(compact);
    }
  }
  for (const key of ["TopicCmd", "TopicRx", "topicCmd", "topicRx"]) {
    const raw = node[key];
    if (typeof raw === "string" && raw.trim() !== "") {
      const match = COMPACT_MAC_IN_TOPIC.exec(raw.trim());
      if (match) {
        return formatColonMacFromCompact(match[1]);
      }
    }
  }
  return null;
}

export function isBrokerStatusResponse(item: FiscalMqttResponseItem | null): boolean {
  if (item == null || !cmdEquals(item.cmd, CMD_STA_INF)) {
    return false;
  }
  if (item.dataS == null || item.dataS.trim() === "") {
    return false;
  }
  const node = parseStaInfDataNode(item.dataS);
  return (
    node != null &&
    ("host" in node || "TopicCmd" in node || "TopicRx" in node)
  );
}

export function parseBrokerStatusResponse(
  response: FiscalMqttResponseItem,
): UsbBrokerStatusInfo {
  if (response.code != null && response.code !== 0) {
    throw new Error(`Error al consultar credenciales MQTT (code: ${response.code})`);
  }
  if (response.dataS == null || response.dataS.trim() === "") {
    throw new Error("La impresora no devolvió información del broker MQTT.");
  }
  const node = parseStaInfDataNode(response.dataS);
  if (node == null) {
    throw new Error("Respuesta de broker MQTT con formato no válido.");
  }
  const host = typeof node.host === "string" ? node.host.trim() : "";
  const port = typeof node.port === "number" ? node.port : null;
  const topicCmd = typeof node.TopicCmd === "string" ? node.TopicCmd.trim() : null;
  const topicRx = typeof node.TopicRx === "string" ? node.TopicRx.trim() : null;
  const mac = extractMacFromNode(node);
  return { host, port, mac, topicCmd, topicRx };
}

export function parseFirmwareStatusResponse(
  response: FiscalMqttResponseItem,
): string {
  if (response.code != null && response.code !== 0) {
    throw new Error(`Error al consultar versión de firmware (code: ${response.code})`);
  }
  const raw = (response.dataS ?? "").trim();
  const match = FIRMWARE_VERSION_PATTERN.exec(raw);
  if (!match) {
    throw new Error(`No se pudo leer la versión de firmware en la respuesta: "${raw}"`);
  }
  return match[1];
}
