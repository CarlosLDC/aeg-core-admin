import { apiFetch } from "@/lib/api";
import { getCatalogForbiddenMessage } from "@/lib/api-permissions";
import { ApiError } from "@/types/auth";
import type {
  DistributorRequest,
  DistributorResponse,
} from "@/types/branch-role";

const BASE = "/api/distributors";

export async function fetchDistributors(): Promise<DistributorResponse[]> {
  return apiFetch<DistributorResponse[]>(BASE);
}

export async function createDistributor(
  body: DistributorRequest,
): Promise<DistributorResponse> {
  return apiFetch<DistributorResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteDistributor(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getDistributorsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return getCatalogForbiddenMessage("MODIFY");
    }
    if (error.status === 404) return "Distribuidor no encontrado.";
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
