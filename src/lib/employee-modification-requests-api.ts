import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  ModificationRequestDetailResponse,
  ModificationRequestListItemResponse,
  ModificationRequestStatus,
} from "@/types/employee-modification-request";

const BASE = "/api/employee-modification-requests";

export async function fetchEmployeeModificationRequests(
  status: ModificationRequestStatus = "PENDING",
): Promise<ModificationRequestListItemResponse[]> {
  return apiFetch<ModificationRequestListItemResponse[]>(
    `${BASE}?status=${encodeURIComponent(status)}`,
  );
}

export async function fetchEmployeeModificationRequestById(
  id: number,
): Promise<ModificationRequestDetailResponse> {
  return apiFetch<ModificationRequestDetailResponse>(`${BASE}/${id}`);
}

export async function approveEmployeeModificationRequest(
  id: number,
): Promise<ModificationRequestDetailResponse> {
  return apiFetch<ModificationRequestDetailResponse>(`${BASE}/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectEmployeeModificationRequest(
  id: number,
): Promise<ModificationRequestDetailResponse> {
  return apiFetch<ModificationRequestDetailResponse>(`${BASE}/${id}/reject`, {
    method: "POST",
  });
}

export function getEmployeeModificationRequestsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "Solicitud no encontrada.";
    if (error.status === 403) return "No tienes permisos para esta operación.";
    return error.message;
  }
  if (error instanceof TypeError) return "No se pudo conectar con el servidor.";
  return "Ha ocurrido un error inesperado.";
}
