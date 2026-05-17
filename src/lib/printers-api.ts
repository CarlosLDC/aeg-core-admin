import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type { PrinterRequest, PrinterResponse } from "@/types/printer";

const BASE = "/api/printers";

export async function fetchPrinters(): Promise<PrinterResponse[]> {
  return apiFetch<PrinterResponse[]>(BASE);
}

export async function fetchPrinterById(id: number): Promise<PrinterResponse> {
  return apiFetch<PrinterResponse>(`${BASE}/${id}`);
}

export async function createPrinter(
  body: PrinterRequest,
): Promise<PrinterResponse> {
  return apiFetch<PrinterResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updatePrinter(
  id: number,
  body: PrinterRequest,
): Promise<PrinterResponse> {
  return apiFetch<PrinterResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deletePrinter(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getPrintersErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "No tienes permiso para ver o modificar esta impresora.";
    }
    if (error.status === 404) return "Impresora no encontrada.";
    if (error.status === 400) {
      return error.message || "Datos de impresora no válidos.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
