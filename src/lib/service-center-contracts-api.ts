import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  ServiceCenterContractRequest,
  ServiceCenterContractResponse,
} from "@/types/contract";

const BASE = "/api/service-center-contracts";

export async function fetchServiceCenterContracts(): Promise<
  ServiceCenterContractResponse[]
> {
  return apiFetch<ServiceCenterContractResponse[]>(BASE);
}

export async function createServiceCenterContract(
  body: ServiceCenterContractRequest,
): Promise<ServiceCenterContractResponse> {
  return apiFetch<ServiceCenterContractResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateServiceCenterContract(
  id: number,
  body: ServiceCenterContractRequest,
): Promise<ServiceCenterContractResponse> {
  return apiFetch<ServiceCenterContractResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteServiceCenterContract(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getServiceCenterContractsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "Solo usuarios con rol ADMIN pueden gestionar contratos.";
    }
    if (error.status === 404) {
      return "Contrato de centro de servicio no encontrado.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
