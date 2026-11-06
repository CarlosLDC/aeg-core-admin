import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type { ModificationRequestStatus } from "@/types/client-modification-request";
import type {
  SoftwareModificationCreateRequest,
  SoftwareModificationRequestDetailResponse,
  SoftwareModificationRequestListItemResponse,
} from "@/types/software-modification-request";

const BASE = "/api/software-modification-requests";

export async function createSoftwareModificationRequest(
  payload: SoftwareModificationCreateRequest,
): Promise<SoftwareModificationRequestDetailResponse> {
  return apiFetch<SoftwareModificationRequestDetailResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchSoftwareModificationRequests(
  status?: ModificationRequestStatus,
): Promise<SoftwareModificationRequestListItemResponse[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<SoftwareModificationRequestListItemResponse[]>(`${BASE}${query}`);
}

export async function fetchPendingSoftwareModificationRequest(
  printerId: number,
): Promise<SoftwareModificationRequestDetailResponse | null> {
  try {
    const res = await apiFetch<SoftwareModificationRequestDetailResponse | null>(
      `${BASE}/pending?printerId=${encodeURIComponent(printerId)}`,
    );
    return res ?? null;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 204 || err.status === 404)) {
      return null;
    }
    return null;
  }
}

export async function fetchSoftwareModificationRequestById(
  id: number,
): Promise<SoftwareModificationRequestDetailResponse> {
  return apiFetch<SoftwareModificationRequestDetailResponse>(`${BASE}/${id}`);
}

export async function approveSoftwareModificationRequest(
  id: number,
): Promise<SoftwareModificationRequestDetailResponse> {
  return apiFetch<SoftwareModificationRequestDetailResponse>(`${BASE}/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectSoftwareModificationRequest(
  id: number,
): Promise<SoftwareModificationRequestDetailResponse> {
  return apiFetch<SoftwareModificationRequestDetailResponse>(`${BASE}/${id}/reject`, {
    method: "POST",
  });
}

export async function cancelSoftwareModificationRequest(
  id: number,
): Promise<SoftwareModificationRequestDetailResponse> {
  return apiFetch<SoftwareModificationRequestDetailResponse>(`${BASE}/${id}/cancel`, {
    method: "POST",
  });
}

export function getSoftwareModificationRequestsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "Solicitud no encontrada.";
    if (error.status === 403) return "No tienes permisos para esta operación.";
    return error.message;
  }
  if (error instanceof TypeError) return "No se pudo conectar con el servidor.";
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Ocurrió un error inesperado al procesar la solicitud de software.";
}
