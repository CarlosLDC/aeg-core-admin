import { getApiBaseUrl } from "@/lib/api";
import { getStoredToken } from "@/lib/auth-storage";
import { redirectToLoginAfterExpired } from "@/lib/session-expired";
import { ApiError } from "@/types/auth";

export interface BrokerMigrationFirmwareResult {
  firmwareVersion: string;
  needsUpdate: boolean;
}

export interface BrokerMigrationBrokerResult {
  currentBrokerHost: string;
  isOldBroker: boolean;
}

export type BrokerMigrationOutcome = 'MIGRATED' | 'REJECTED' | 'UNCERTAIN';

export interface BrokerMigrationConfigResult {
  outcome: BrokerMigrationOutcome;
  message: string;
}

const BASE = "/api/mqtt/tools/broker-migration";

async function brokerMigrationFetch<T>(
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

function printerBody(printerId: number): string {
  return JSON.stringify({ printerId });
}

export async function checkFirmwareVersion(printerId: number): Promise<BrokerMigrationFirmwareResult> {
  const { data, status } = await brokerMigrationFetch<BrokerMigrationFirmwareResult>(
    `${BASE}/check-firmware`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo verificar la versión de firmware.");
  return data;
}

export async function triggerFirmwareUpdate(printerId: number): Promise<{ success: boolean; message: string }> {
  const { data, status } = await brokerMigrationFetch<{ success: boolean; message: string }>(
    `${BASE}/update-firmware`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo iniciar la actualización de firmware.");
  return data;
}

export async function checkCurrentBroker(printerId: number): Promise<BrokerMigrationBrokerResult> {
  const { data, status } = await brokerMigrationFetch<BrokerMigrationBrokerResult>(
    `${BASE}/check-broker`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo verificar el broker actual.");
  return data;
}

export async function configureBroker(printerId: number): Promise<BrokerMigrationConfigResult> {
  const { data, status } = await brokerMigrationFetch<BrokerMigrationConfigResult>(
    `${BASE}/configure-broker`,
    { method: "POST", body: printerBody(printerId) },
  );
  ensureSuccess(status, data, "No se pudo configurar el broker.");
  return data;
}
