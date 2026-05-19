import { apiFetch } from "@/lib/api";
import { getCatalogForbiddenMessage } from "@/lib/api-permissions";
import { ApiError } from "@/types/auth";
import type {
  ServiceCenterRequest,
  ServiceCenterResponse,
} from "@/types/branch-role";

const BASE = "/api/service-centers";

export async function fetchServiceCenters(): Promise<ServiceCenterResponse[]> {
  // #region agent log
  try {
    const rows = await apiFetch<ServiceCenterResponse[]>(BASE);
    fetch("http://127.0.0.1:7781/ingest/0c54bab8-f62a-45dc-8c96-475b3dbd518d", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "f91276",
      },
      body: JSON.stringify({
        sessionId: "f91276",
        location: "service-centers-api.ts:fetchServiceCenters",
        message: "GET /api/service-centers ok",
        data: { count: rows.length },
        hypothesisId: "H5",
        runId: "post-fix",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    return rows;
  } catch (error) {
    fetch("http://127.0.0.1:7781/ingest/0c54bab8-f62a-45dc-8c96-475b3dbd518d", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "f91276",
      },
      body: JSON.stringify({
        sessionId: "f91276",
        location: "service-centers-api.ts:fetchServiceCenters",
        message: "GET /api/service-centers failed",
        data: {
          status: error instanceof ApiError ? error.status : null,
        },
        hypothesisId: "H5",
        runId: "post-fix",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    throw error;
  }
  // #endregion
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
