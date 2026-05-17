import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type { SoftwareResponse } from "@/types/software";

const BASE = "/api/software";

export async function fetchSoftware(): Promise<SoftwareResponse[]> {
  return apiFetch<SoftwareResponse[]>(BASE);
}

export function getSoftwareErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "Solo un administrador puede consultar el catálogo de software.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
