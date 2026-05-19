import { apiFetch } from "@/lib/api";
import { getCatalogErrorMessage } from "@/lib/api-error-message";
import { getCatalogForbiddenMessage } from "@/lib/api-permissions";
import { ApiError } from "@/types/auth";
import type { ClientRequest, ClientResponse } from "@/types/branch-role";

const BASE = "/api/clients";

export async function fetchClients(): Promise<ClientResponse[]> {
  return apiFetch<ClientResponse[]>(BASE);
}

export async function fetchClientByBranchId(
  branchId: number,
): Promise<ClientResponse | null> {
  try {
    return await apiFetch<ClientResponse>(`${BASE}/by-branch/${branchId}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createClient(body: ClientRequest): Promise<ClientResponse> {
  return apiFetch<ClientResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateClient(
  id: number,
  body: ClientRequest,
): Promise<ClientResponse> {
  return apiFetch<ClientResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteClient(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getClientsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return getCatalogForbiddenMessage("MODIFY");
    }
    if (error.status === 404) return "Cliente no encontrado.";
    return error.message;
  }
  return getCatalogErrorMessage(error);
}
