import { apiFetch } from "@/lib/api";
import { getCatalogForbiddenMessage } from "@/lib/api-permissions";
import { ApiError } from "@/types/auth";
import type {
  ServiceCenterRequest,
  ServiceCenterResponse,
} from "@/types/branch-role";

const BASE = "/api/service-centers";

export async function fetchServiceCenters(): Promise<ServiceCenterResponse[]> {
  return apiFetch<ServiceCenterResponse[]>(BASE);
}

export async function createServiceCenter(
  body: ServiceCenterRequest,
): Promise<ServiceCenterResponse> {
  return apiFetch<ServiceCenterResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteServiceCenter(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getServiceCentersErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return getCatalogForbiddenMessage("MODIFY");
    }
    if (error.status === 404) return "Centro de servicio no encontrado.";
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
