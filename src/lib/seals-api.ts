import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type { SealRequest, SealResponse } from "@/types/seal";

const BASE = "/api/seals";

export async function fetchSeals(): Promise<SealResponse[]> {
  return apiFetch<SealResponse[]>(BASE);
}

export async function fetchSealById(id: number): Promise<SealResponse> {
  return apiFetch<SealResponse>(`${BASE}/${id}`);
}

export async function createSeal(body: SealRequest): Promise<SealResponse> {
  return apiFetch<SealResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateSeal(
  id: number,
  body: SealRequest,
): Promise<SealResponse> {
  return apiFetch<SealResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteSeal(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getSealsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "No tienes permiso para gestionar precintos fiscales.";
    }
    if (error.status === 404) return "Precinto no encontrado.";
    if (error.status === 400) {
      return error.message || "Datos del precinto no válidos.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
