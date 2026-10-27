import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  AbnormalityRequest,
  AbnormalityResponse,
} from "@/types/abnormality";

const BASE = "/api/abnormalities";

export async function fetchAbnormalities(): Promise<AbnormalityResponse[]> {
  return apiFetch<AbnormalityResponse[]>(BASE);
}

export async function createAbnormality(
  body: AbnormalityRequest,
): Promise<AbnormalityResponse> {
  return apiFetch<AbnormalityResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getAbnormalitiesErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "No tienes permiso para gestionar anormalidades.";
    }
    if (error.status === 404) return "Impresora no encontrada.";
    if (error.status === 400) {
      return error.message || "Datos de la anormalidad no válidos.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
