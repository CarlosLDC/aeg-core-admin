import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type { SoftwareRequest, SoftwareResponse } from "@/types/software";

const BASE = "/api/software";

export async function fetchSoftware(): Promise<SoftwareResponse[]> {
  return apiFetch<SoftwareResponse[]>(BASE);
}

export async function fetchSoftwareById(id: number): Promise<SoftwareResponse> {
  return apiFetch<SoftwareResponse>(`${BASE}/${id}`);
}

export async function createSoftware(
  body: SoftwareRequest,
): Promise<SoftwareResponse> {
  return apiFetch<SoftwareResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateSoftware(
  id: number,
  body: SoftwareRequest,
): Promise<SoftwareResponse> {
  return apiFetch<SoftwareResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteSoftware(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export async function addSoftwareDistributor(
  softwareId: number,
  companyId: number,
): Promise<SoftwareResponse> {
  return apiFetch<SoftwareResponse>(`${BASE}/${softwareId}/distributors/${companyId}`, {
    method: "POST",
  });
}

export async function removeSoftwareDistributor(
  softwareId: number,
  companyId: number,
): Promise<SoftwareResponse> {
  return apiFetch<SoftwareResponse>(`${BASE}/${softwareId}/distributors/${companyId}`, {
    method: "DELETE",
  });
}

export function getSoftwareErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return (
        error.message || "Solo un administrador puede gestionar el catálogo de software."
      );
    }
    if (error.status === 404) {
      return "Software o empresa no encontrada.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
