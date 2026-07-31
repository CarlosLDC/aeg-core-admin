import { apiFetch, readErrorMessage } from "@/lib/api";
import { resolveDirectApiBaseUrl } from "@/lib/api-config";
import { getStoredToken } from "@/lib/auth-storage";
import { redirectToLoginAfterExpired } from "@/lib/session-expired";
import { ApiError } from "@/types/auth";
import type { CreateFirmwareInput, FirmwareResponse } from "@/types/firmware";

const BASE = "/api/firmwares";

/**
 * Subida/descarga de .bin evita el rewrite same-origin de Vercel: el proxy
 * corta peticiones largas con 504 antes de que el backend termine el SFTP.
 */
function firmwareDirectUrl(path: string): string {
  const base = resolveDirectApiBaseUrl().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function firmwareDirectFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = getStoredToken();
  if (!token) {
    throw new ApiError("No hay sesión activa", 401);
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(firmwareDirectUrl(path), {
    ...init,
    headers,
    credentials: "omit",
  });

  if (response.status === 401) {
    redirectToLoginAfterExpired();
    throw new ApiError("Sesión expirada o no válida", 401);
  }

  return response;
}

export async function fetchFirmwares(
  printerModelId?: number | null,
): Promise<FirmwareResponse[]> {
  const query =
    printerModelId != null
      ? `?printerModelId=${encodeURIComponent(String(printerModelId))}`
      : "";
  return apiFetch<FirmwareResponse[]>(`${BASE}${query}`);
}

export async function fetchFirmwareById(
  id: number,
): Promise<FirmwareResponse> {
  return apiFetch<FirmwareResponse>(`${BASE}/${id}`);
}

export async function createFirmware(
  input: CreateFirmwareInput,
): Promise<FirmwareResponse> {
  const body = new FormData();
  body.append("file", input.file);
  body.append("version", input.version.trim());
  if (input.printerModelId != null) {
    body.append("printerModelId", String(input.printerModelId));
  }
  if (input.notes?.trim()) {
    body.append("notes", input.notes.trim());
  }

  const response = await firmwareDirectFetch(BASE, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json() as Promise<FirmwareResponse>;
}

export async function deleteFirmware(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

function filenameFromContentDisposition(
  header: string | null,
  fallback: string,
): string {
  if (!header) return fallback;
  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }
  const plainMatch = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plainMatch?.[1]?.trim() || fallback;
}

/** Descarga autenticada directa al backend; dispara guardado en el navegador. */
export async function downloadFirmware(
  id: number,
  fallbackFileName: string,
): Promise<void> {
  const response = await firmwareDirectFetch(`${BASE}/${id}/download`);

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  const blob = await response.blob();
  const fileName = filenameFromContentDisposition(
    response.headers.get("Content-Disposition"),
    fallbackFileName,
  );
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function getFirmwaresErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return (
        error.message ||
        "No tienes permiso para administrar versiones de firmware."
      );
    }
    if (error.status === 404) {
      return "Versión de firmware no encontrada.";
    }
    if (error.status === 409) {
      return (
        error.message ||
        "Ya existe una versión de firmware con esos datos."
      );
    }
    if (error.status === 504 || error.status === 502) {
      return (
        error.message ||
        "El servidor tardó demasiado en subir o transferir el binario. Reintenta; si persiste, revisa la conexión SFTP del backend."
      );
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
