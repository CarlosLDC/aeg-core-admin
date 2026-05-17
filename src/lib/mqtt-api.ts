import { getApiBaseUrl } from "@/lib/api";
import { getStoredToken } from "@/lib/auth-storage";
import { redirectToLoginAfterExpired } from "@/lib/session-expired";
import { ApiError } from "@/types/auth";
import type {
  MqttConnectionProbeResult,
  MqttPublishRequest,
  MqttPublishResponse,
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
    throw new ApiError("Solo usuarios ADMIN pueden usar las pruebas MQTT.", 403);
  }

  return { data, status: response.status };
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
