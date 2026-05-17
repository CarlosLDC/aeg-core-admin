import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  DistributorContractRequest,
  DistributorContractResponse,
} from "@/types/contract";

const BASE = "/api/distributor-contracts";

export async function fetchDistributorContracts(): Promise<
  DistributorContractResponse[]
> {
  return apiFetch<DistributorContractResponse[]>(BASE);
}

export async function createDistributorContract(
  body: DistributorContractRequest,
): Promise<DistributorContractResponse> {
  return apiFetch<DistributorContractResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateDistributorContract(
  id: number,
  body: DistributorContractRequest,
): Promise<DistributorContractResponse> {
  return apiFetch<DistributorContractResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteDistributorContract(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getDistributorContractsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "Solo un administrador puede gestionar contratos.";
    }
    if (error.status === 404) {
      return "Contrato de distribuidora no encontrado.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
