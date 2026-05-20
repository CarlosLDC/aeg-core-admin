import { getApiBaseUrl } from "@/lib/api";
import { getStoredToken } from "@/lib/auth-storage";
import { redirectToLoginAfterExpired } from "@/lib/session-expired";
import { ApiError } from "@/types/auth";
import type {
  MqttConnectionProbeResult,
  MqttInboundMessage,
  MqttMonitorStatus,
  MqttPublishRequest,
  MqttPublishResponse,
  MqttSubscriptionResponse,
  MqttTestMessageResponse,
} from "@/types/mqtt";

const BASE = "/api/mqtt";

async function mqttFetch<T>(
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
    throw new ApiError("Solo un administrador puede usar las pruebas MQTT.", 403);
  }

  return { data, status: response.status };
}

function ensureMqttSuccess(status: number, data: unknown, fallback: string): void {
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

/** El probe devuelve 200 si conecta o 503 si falla; en ambos casos incluye el cuerpo JSON. */
export async function checkMqttConnection(): Promise<{
  result: MqttConnectionProbeResult;
  httpStatus: number;
}> {
  const { data, status } = await mqttFetch<MqttConnectionProbeResult>(
    `${BASE}/connection-check`,
  );
  return { result: data, httpStatus: status };
}

export async function sendMqttTestMessage(): Promise<MqttTestMessageResponse> {
  const { data } = await mqttFetch<MqttTestMessageResponse>(`${BASE}/test`, {
    method: "POST",
  });
  if (data === undefined) {
    throw new ApiError("Respuesta vacía del servidor", 500);
  }
  return data;
}

export async function publishMqttMessage(
  body: MqttPublishRequest,
): Promise<{ response: MqttPublishResponse; httpStatus: number }> {
  const { data, status } = await mqttFetch<MqttPublishResponse>(
    `${BASE}/publish`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  if (data === undefined) {
    throw new ApiError("Respuesta vacía del servidor", 500);
  }
  if (status !== 202 && status !== 200) {
    throw new ApiError(
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: string }).message)
        : "No se pudo publicar en MQTT",
      status,
    );
  }
  return { response: data, httpStatus: status };
}

export async function getMqttMonitorStatus(): Promise<MqttMonitorStatus> {
  const { data, status } = await mqttFetch<MqttMonitorStatus>(`${BASE}/status`);
  ensureMqttSuccess(status, data, "No se pudo obtener el estado del monitor.");
  if (data === undefined) {
    throw new ApiError("Respuesta vacía del servidor", 500);
  }
  return data;
}

export async function getMqttSubscription(): Promise<MqttSubscriptionResponse> {
  const { data, status } = await mqttFetch<MqttSubscriptionResponse>(
    `${BASE}/subscription`,
  );
  ensureMqttSuccess(status, data, "No se pudo leer la suscripción MQTT.");
  if (data === undefined) {
    throw new ApiError("Respuesta vacía del servidor", 500);
  }
  return data;
}

export async function updateMqttSubscription(
  topic: string,
): Promise<MqttSubscriptionResponse> {
  const { data, status } = await mqttFetch<MqttSubscriptionResponse>(
    `${BASE}/subscription`,
    {
      method: "PUT",
      body: JSON.stringify({ topic }),
    },
  );
  if (status === 503) {
    throw new ApiError(
      "La suscripción entrante MQTT no está activa en el servidor.",
      503,
    );
  }
  ensureMqttSuccess(status, data, "No se pudo actualizar el tópico.");
  if (data === undefined) {
    throw new ApiError("Respuesta vacía del servidor", 500);
  }
  return data;
}

export async function getMqttRecentMessages(
  limit = 50,
): Promise<MqttInboundMessage[]> {
  const { data, status } = await mqttFetch<MqttInboundMessage[]>(
    `${BASE}/messages?limit=${limit}`,
  );
  ensureMqttSuccess(status, data, "No se pudo cargar el historial.");
  return data ?? [];
}

export function getMqttWebSocketUrl(): string {
  const token = getStoredToken();
  if (!token) {
    throw new ApiError("No hay sesión activa", 401);
  }
  const httpBase = getApiBaseUrl().replace(/\/$/, "");
  const wsBase = httpBase.replace(/^http/i, (scheme) =>
    scheme.toLowerCase() === "https" ? "wss" : "ws",
  );
  return `${wsBase}/ws/mqtt?token=${encodeURIComponent(token)}`;
}

export function getMqttErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Ha ocurrido un error inesperado.";
}
