import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  TechnicianRequest,
  TechnicianResponse,
} from "@/types/employee-role";

const BASE = "/api/technicians";

export async function fetchTechnicians(): Promise<TechnicianResponse[]> {
  return apiFetch<TechnicianResponse[]>(BASE);
}

export async function createTechnician(
  body: TechnicianRequest,
): Promise<TechnicianResponse> {
  return apiFetch<TechnicianResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteTechnician(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getTechniciansErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "No tienes permiso para gestionar registros de técnico.";
    }
    if (error.status === 404) {
      return "Registro de técnico no encontrado.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error al gestionar el técnico.";
}
