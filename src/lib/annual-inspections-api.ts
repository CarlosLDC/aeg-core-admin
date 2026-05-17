import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  AnnualInspectionRequest,
  AnnualInspectionResponse,
} from "@/types/annual-inspection";

const BASE = "/api/annual-inspections";

export async function fetchAnnualInspections(): Promise<
  AnnualInspectionResponse[]
> {
  return apiFetch<AnnualInspectionResponse[]>(BASE);
}

export async function createAnnualInspection(
  body: AnnualInspectionRequest,
): Promise<AnnualInspectionResponse> {
  return apiFetch<AnnualInspectionResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateAnnualInspection(
  id: number,
  body: AnnualInspectionRequest,
): Promise<AnnualInspectionResponse> {
  return apiFetch<AnnualInspectionResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteAnnualInspection(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getAnnualInspectionsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "No tienes permiso para gestionar inspecciones anuales.";
    }
    if (error.status === 404) return "Inspección no encontrada.";
    if (error.status === 400) {
      return error.message || "Datos de la inspección no válidos.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
