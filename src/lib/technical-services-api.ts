import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  TechnicalServiceRequest,
  TechnicalServiceResponse,
} from "@/types/technical-service";

const BASE = "/api/technical-services";

export async function fetchTechnicalServices(): Promise<
  TechnicalServiceResponse[]
> {
  return apiFetch<TechnicalServiceResponse[]>(BASE);
}

export async function fetchTechnicalServiceById(
  id: number,
): Promise<TechnicalServiceResponse> {
  return apiFetch<TechnicalServiceResponse>(`${BASE}/${id}`);
}

export async function createTechnicalService(
  body: TechnicalServiceRequest,
): Promise<TechnicalServiceResponse> {
  return apiFetch<TechnicalServiceResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateTechnicalService(
  id: number,
  body: TechnicalServiceRequest,
): Promise<TechnicalServiceResponse> {
  return apiFetch<TechnicalServiceResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteTechnicalService(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getTechnicalServicesErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "No tienes permiso para gestionar servicios técnicos.";
    }
    if (error.status === 404) return "Servicio técnico no encontrado.";
    if (error.status === 400) {
      return error.message || "Datos del servicio no válidos.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
