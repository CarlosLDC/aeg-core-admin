import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  DistributorPersonRequest,
  DistributorPersonResponse,
} from "@/types/employee-role";

const BASE = "/api/distributor-persons";

export async function fetchDistributorPersons(): Promise<
  DistributorPersonResponse[]
> {
  return apiFetch<DistributorPersonResponse[]>(BASE);
}

export async function createDistributorPerson(
  body: DistributorPersonRequest,
): Promise<DistributorPersonResponse> {
  return apiFetch<DistributorPersonResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteDistributorPerson(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getDistributorPersonsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "No tienes permiso para gestionar personas distribuidor.";
    }
    if (error.status === 404) {
      return "Persona distribuidor no encontrada.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error al gestionar la persona distribuidor.";
}
