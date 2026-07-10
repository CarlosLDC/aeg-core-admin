import { getApiBaseUrl } from "@/lib/api";
import { getStoredToken } from "@/lib/auth-storage";
import { redirectToLoginAfterExpired } from "@/lib/session-expired";
import { ApiError } from "@/types/auth";
import type {
  ToolsFormasPagoReadResponse,
  ToolsHeaderFooterReadResponse,
  ToolsMqttSimpleResponse,
  ToolsMqttStatusResponse,
  ToolsReprintMode,
  ToolsReprintResponse,
  ToolsReportZResponse,
  ToolsTransmitZResponse,
  ToolsWifiScanResponse,
} from "@/types/tools-mqtt";
import { TOOLS_PRINTER_STATUS_TIMEOUT_MS } from "@/lib/tools-printer-connection";
import { normalizeToolsWifiNetworks } from "@/lib/tools-wifi-networks";

const BASE = "/api/mqtt/tools";

async function toolsMqttFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; status: number }> {
  const token = getStoredToken();
  if (!token) {
    throw new ApiError("No hay sesión activa", 401);
  }

  const url = `${getApiBaseUrl()}${path}`;
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "omit",
  });

  const contentType = response.headers.get("content-type");
  let data: T;
  if (contentType?.includes("application/json")) {
    data = (await response.json()) as T;
  } else {
    data = undefined as T;
  }

  if (response.status === 401) {
    redirectToLoginAfterExpired();
    throw new ApiError("Sesión expirada o no válida", 401);
  }

  if (response.status === 403) {
    throw new ApiError("No tienes permiso para operar esta impresora vía Tools.", 403);
  }

  return { data, status: response.status };
}

function readMqttPayloadFields(data: unknown): {
  message?: string;
  code?: number;
  success?: boolean;
} {
  if (!data || typeof data !== "object") {
    return {};
  }

  const payload = data as Record<string, unknown>;
  return {
    message:
      typeof payload.message === "string" && payload.message.length > 0
        ? payload.message
        : undefined,
    code: typeof payload.code === "number" ? payload.code : undefined,
    success: typeof payload.success === "boolean" ? payload.success : undefined,
  };
}

function ensureSuccess(status: number, data: unknown, fallback: string): void {
  if (status >= 200 && status < 300) {
    return;
  }
  const { message, code } = readMqttPayloadFields(data);
  throw new ApiError(message ?? fallback, status, code);
}

function ensureMqttOperationSuccess(
  status: number,
  data: unknown,
  fallback: string,
): void {
  ensureSuccess(status, data, fallback);
  const { message, code, success } = readMqttPayloadFields(data);
  if (success === false) {
    throw new ApiError(message ?? fallback, status, code);
  }
}

/** Código fiscal cuando el reporte Z solicitado no existe en la impresora. */
export const TOOLS_FISCAL_ERROR_Z_NOT_FOUND = 48;

function printerBody(printerId: number): string {
  return JSON.stringify({ printerId });
}

export async function fetchToolsMqttStatus(
  printerId: number,
): Promise<ToolsMqttStatusResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    TOOLS_PRINTER_STATUS_TIMEOUT_MS,
  );

  try {
    const { data, status } = await toolsMqttFetch<ToolsMqttStatusResponse>(
      `${BASE}/status`,
      {
        method: "POST",
        body: printerBody(printerId),
        signal: controller.signal,
      },
    );
    ensureSuccess(status, data, "No se pudo consultar el estado de la impresora.");
    return data;
  } catch (error) {
    if (
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new ApiError(
        "Tiempo de espera agotado al consultar la impresora fiscal.",
        408,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function scanToolsWifi(printerId: number): Promise<ToolsWifiScanResponse> {
  const { data, status } = await toolsMqttFetch<ToolsWifiScanResponse>(
    `${BASE}/wifi/scan`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo escanear redes WiFi.");
  if (
    data &&
    typeof data === "object" &&
    "success" in data &&
    data.success === false
  ) {
    throw new ApiError(
      typeof data.message === "string" && data.message.length > 0
        ? data.message
        : "No se pudo escanear redes WiFi.",
      status,
    );
  }
  return {
    ...data,
    networks: normalizeToolsWifiNetworks(data.networks),
  };
}

export async function connectToolsWifi(
  printerId: number,
  ssid: string,
  password: string,
): Promise<ToolsMqttSimpleResponse> {
  const { data, status } = await toolsMqttFetch<ToolsMqttSimpleResponse>(
    `${BASE}/wifi/connect`,
    {
      method: "POST",
      body: JSON.stringify({ printerId, ssid, password }),
    },
  );
  ensureSuccess(status, data, "No se pudo conectar a la red WiFi.");
  return data;
}

export async function resetToolsWifi(printerId: number): Promise<ToolsMqttSimpleResponse> {
  const { data, status } = await toolsMqttFetch<ToolsMqttSimpleResponse>(
    `${BASE}/wifi/reset`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo reiniciar la configuración WiFi.");
  return data;
}

export async function listToolsReportZ(printerId: number): Promise<ToolsReportZResponse> {
  const { data, status } = await toolsMqttFetch<ToolsReportZResponse>(
    `${BASE}/reports-z/list`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureMqttOperationSuccess(status, data, "No se pudo consultar el reporte Z.");
  return data;
}

export async function generateToolsReportZ(printerId: number): Promise<ToolsReportZResponse> {
  const { data, status } = await toolsMqttFetch<ToolsReportZResponse>(
    `${BASE}/reports-z/generate`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureMqttOperationSuccess(status, data, "No se pudo generar el reporte Z.");
  return data;
}

export async function getToolsReportZ(
  printerId: number,
  reportNumber: number,
): Promise<ToolsReportZResponse> {
  const { data, status } = await toolsMqttFetch<ToolsReportZResponse>(
    `${BASE}/reports-z/get`,
    {
      method: "POST",
      body: JSON.stringify({ printerId, reportNumber }),
    },
  );
  ensureMqttOperationSuccess(status, data, "No se pudo obtener el reporte Z.");
  return data;
}

export async function transmitToolsReportZ(
  printerId: number,
): Promise<ToolsTransmitZResponse> {
  const { data, status } = await toolsMqttFetch<ToolsTransmitZResponse>(
    `${BASE}/reports-z/transmit`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo transmitir el reporte Z.");
  return data;
}

export async function sendToolsReportX(printerId: number): Promise<ToolsMqttSimpleResponse> {
  const { data, status } = await toolsMqttFetch<ToolsMqttSimpleResponse>(
    `${BASE}/report-x`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo enviar el reporte X.");
  return data;
}

export async function readToolsFormasPago(
  printerId: number,
): Promise<ToolsFormasPagoReadResponse> {
  const { data, status } = await toolsMqttFetch<ToolsFormasPagoReadResponse>(
    `${BASE}/formas-pago/read`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudieron leer las formas de pago.");
  return data;
}

export async function writeToolsFormasPago(
  printerId: number,
  nroFP: number,
  descripcion: string,
): Promise<ToolsMqttSimpleResponse> {
  const { data, status } = await toolsMqttFetch<ToolsMqttSimpleResponse>(
    `${BASE}/formas-pago/write`,
    {
      method: "POST",
      body: JSON.stringify({ printerId, nroFP, descripcion }),
    },
  );
  ensureSuccess(status, data, "No se pudo actualizar la forma de pago.");
  return data;
}

export async function readToolsHeader(
  printerId: number,
): Promise<ToolsHeaderFooterReadResponse> {
  const { data, status } = await toolsMqttFetch<ToolsHeaderFooterReadResponse>(
    `${BASE}/header/read`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo leer el encabezado.");
  return data;
}

export async function writeToolsHeader(
  printerId: number,
  content: string,
): Promise<ToolsMqttSimpleResponse> {
  const { data, status } = await toolsMqttFetch<ToolsMqttSimpleResponse>(
    `${BASE}/header/write`,
    {
      method: "POST",
      body: JSON.stringify({ printerId, content }),
    },
  );
  ensureSuccess(status, data, "No se pudo escribir el encabezado.");
  return data;
}

export async function readToolsFooter(
  printerId: number,
): Promise<ToolsHeaderFooterReadResponse> {
  const { data, status } = await toolsMqttFetch<ToolsHeaderFooterReadResponse>(
    `${BASE}/footer/read`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo leer el pie de página.");
  return data;
}

export async function writeToolsFooter(
  printerId: number,
  content: string,
): Promise<ToolsMqttSimpleResponse> {
  const { data, status } = await toolsMqttFetch<ToolsMqttSimpleResponse>(
    `${BASE}/footer/write`,
    {
      method: "POST",
      body: JSON.stringify({ printerId, content }),
    },
  );
  ensureSuccess(status, data, "No se pudo escribir el pie de página.");
  return data;
}

export async function reprintToolsDocument(
  printerId: number,
  options: {
    docType?: string;
    number?: number;
    mode?: ToolsReprintMode;
  },
): Promise<ToolsReprintResponse> {
  const { data, status } = await toolsMqttFetch<ToolsReprintResponse>(
    `${BASE}/reprint`,
    {
      method: "POST",
      body: JSON.stringify({
        printerId,
        docType: options.docType,
        number: options.number,
        mode: options.mode ?? "visualize",
      }),
    },
  );
  ensureMqttOperationSuccess(status, data, "No se pudo reimprimir el documento.");
  return data;
}

export async function sendToolsTestInvoice(
  printerId: number,
): Promise<ToolsMqttSimpleResponse> {
  const { data, status } = await toolsMqttFetch<ToolsMqttSimpleResponse>(
    `${BASE}/test-documents/invoice`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo generar la factura de prueba.");
  return data;
}

export async function sendToolsTestCreditNote(
  printerId: number,
): Promise<ToolsMqttSimpleResponse> {
  const { data, status } = await toolsMqttFetch<ToolsMqttSimpleResponse>(
    `${BASE}/test-documents/credit-note`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo generar la nota de crédito de prueba.");
  return data;
}

export async function sendToolsTestDebitNote(
  printerId: number,
): Promise<ToolsMqttSimpleResponse> {
  const { data, status } = await toolsMqttFetch<ToolsMqttSimpleResponse>(
    `${BASE}/test-documents/debit-note`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo generar la nota de débito de prueba.");
  return data;
}

export async function sendToolsTestGenerateZ(
  printerId: number,
): Promise<ToolsMqttSimpleResponse> {
  const { data, status } = await toolsMqttFetch<ToolsMqttSimpleResponse>(
    `${BASE}/test-documents/generate-z`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo generar el reporte Z de prueba.");
  return data;
}

export function getToolsMqttErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Error de comunicación con la impresora.";
}

function isToolsFiscalNotFoundError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  if (error.code === TOOLS_FISCAL_ERROR_Z_NOT_FOUND) {
    return true;
  }

  return /\b48\b/.test(error.message);
}

const REPRINT_DOC_TYPE_LABELS: Record<string, string> = {
  FAC: "una factura",
  NC: "una nota de crédito",
  ND: "una nota de débito",
  NF: "un documento no fiscal",
  Z: "un reporte Z",
};

export function getToolsReprintErrorMessage(
  error: unknown,
  options?: { docType?: string; number?: number },
): string {
  if (isToolsFiscalNotFoundError(error)) {
    const label =
      (options?.docType && REPRINT_DOC_TYPE_LABELS[options.docType]) ||
      "un documento";
    return options?.number != null
      ? `No existe ${label} con el número ${options.number}.`
      : `No existe ${label} con el número indicado.`;
  }

  return getToolsMqttErrorMessage(error);
}

export function getToolsReportZErrorMessage(
  error: unknown,
  reportNumber?: number,
): string {
  if (isToolsFiscalNotFoundError(error)) {
    return reportNumber != null
      ? `No existe un reporte Z con el número ${reportNumber}.`
      : "No existe un reporte Z con el número indicado.";
  }

  return getToolsMqttErrorMessage(error);
}
