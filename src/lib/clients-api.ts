import { apiFetch } from "@/lib/api";
import { getCatalogErrorMessage } from "@/lib/api-error-message";
import { getCatalogForbiddenMessage } from "@/lib/api-permissions";
import type { ClientModificationProposedData } from "@/types/client-modification-request";
import { ApiError } from "@/types/auth";
import type { ClientRequest, ClientResponse } from "@/types/branch-role";

const BASE = "/api/clients";
const ADMIN_BASE = "/api/admin/clients";
const MOD_BASE = "/api/client-modification-requests";

export async function fetchClients(): Promise<ClientResponse[]> {
  return apiFetch<ClientResponse[]>(BASE);
}

export async function fetchClientById(id: number): Promise<ClientResponse> {
  return apiFetch<ClientResponse>(`${BASE}/${id}`);
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

export async function transferClientDistributor(
  clientId: number,
  distributorId: number,
): Promise<ClientResponse> {
  return apiFetch<ClientResponse>(
    `${ADMIN_BASE}/${clientId}/transfer-distributor`,
    {
      method: "POST",
      body: JSON.stringify({ distributorId }),
    },
  );
}

export async function deleteClient(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export async function requestClientUpdate(
  clientId: number,
  proposedData: ClientModificationProposedData,
): Promise<void> {
  await apiFetch(`${MOD_BASE}/update`, {
    method: "POST",
    body: JSON.stringify({ clientId, proposedData }),
  });
}

export async function requestClientDelete(clientId: number): Promise<void> {
  await apiFetch(`${MOD_BASE}/delete`, {
    method: "POST",
    body: JSON.stringify({ clientId }),
  });
}

export function getClientsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return getCatalogForbiddenMessage("MODIFY");
    }
    if (error.status === 404) return "Cliente no encontrado.";
    const lower = error.message.toLowerCase();
    if (lower.includes("pending review")) {
      return "El cliente tiene una solicitud de revisión pendiente.";
    }
    if (lower.includes("already assigned")) {
      return "El cliente ya está asignado a esa distribuidora.";
    }
    if (lower.includes("only administrators")) {
      return "Solo un administrador puede transferir clientes.";
    }
    return error.message;
  }
  return getCatalogErrorMessage(error);
}
