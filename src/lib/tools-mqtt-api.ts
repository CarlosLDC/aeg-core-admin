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

function ensureSuccess(status: number, data: unknown, fallback: string): void {
  if (status >= 200 && status < 300) {
    return;
  }
  const message =
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof (data as { message: unknown }).message === "string"
      ? (data as { message: string }).message
      : fallback;
  throw new ApiError(message, status);
}

function printerBody(printerId: number): string {
  return JSON.stringify({ printerId });
}

export async function fetchToolsMqttStatus(
  printerId: number,
): Promise<ToolsMqttStatusResponse> {
  const { data, status } = await toolsMqttFetch<ToolsMqttStatusResponse>(
    `${BASE}/status`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo consultar el estado de la impresora.");
  return data;
}

export async function scanToolsWifi(printerId: number): Promise<ToolsWifiScanResponse> {
  const { data, status } = await toolsMqttFetch<ToolsWifiScanResponse>(
    `${BASE}/wifi/scan`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo escanear redes WiFi.");
  return data;
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
  ensureSuccess(status, data, "No se pudo consultar el reporte Z.");
  return data;
}

export async function generateToolsReportZ(printerId: number): Promise<ToolsReportZResponse> {
  const { data, status } = await toolsMqttFetch<ToolsReportZResponse>(
    `${BASE}/reports-z/generate`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo generar el reporte Z.");
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
  ensureSuccess(status, data, "No se pudo obtener el reporte Z.");
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
  ensureSuccess(status, data, "No se pudo reimprimir el documento.");
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
