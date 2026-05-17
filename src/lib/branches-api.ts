import { apiFetch } from "@/lib/api";
import { getCatalogForbiddenMessage } from "@/lib/api-permissions";
import { ApiError } from "@/types/auth";
import type { BranchRequest, BranchResponse } from "@/types/branch";

const BASE = "/api/branches";

export async function fetchBranches(): Promise<BranchResponse[]> {
  return apiFetch<BranchResponse[]>(BASE);
}

export async function fetchBranchById(id: number): Promise<BranchResponse> {
  return apiFetch<BranchResponse>(`${BASE}/${id}`);
}

export async function createBranch(body: BranchRequest): Promise<BranchResponse> {
  return apiFetch<BranchResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateBranch(
  id: number,
  body: BranchRequest,
): Promise<BranchResponse> {
  return apiFetch<BranchResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteBranch(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getBranchesErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Sesión no válida. Vuelve a iniciar sesión.";
    }
    if (error.status === 403) {
      return getCatalogForbiddenMessage("MODIFY");
    }
    if (error.status === 404) {
      return "Sucursal o empresa no encontrada.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
