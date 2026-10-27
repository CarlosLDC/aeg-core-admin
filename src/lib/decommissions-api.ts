import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  DecommissionRequest,
  DecommissionResponse,
} from "@/types/decommission";

function basePath(printerId: number): string {
  return `/api/printers/${printerId}/desincorporaciones`;
}

export async function fetchPrinterDecommissions(
  printerId: number,
): Promise<DecommissionResponse[]> {
  return apiFetch<DecommissionResponse[]>(basePath(printerId));
}

export async function decommissionPrinter(
  printerId: number,
  body: DecommissionRequest,
): Promise<DecommissionResponse> {
  return apiFetch<DecommissionResponse>(basePath(printerId), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getDecommissionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "Solo un administrador puede desincorporar impresoras.";
    }
    if (error.status === 404) return "Impresora no encontrada.";
    if (error.status === 400) {
      return error.message || "Datos de la desincorporación no válidos.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
