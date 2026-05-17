import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  PrinterModelRequest,
  PrinterModelResponse,
} from "@/types/printer-model";

const BASE = "/api/printer-models";

export async function fetchPrinterModels(): Promise<PrinterModelResponse[]> {
  return apiFetch<PrinterModelResponse[]>(BASE);
}

export async function fetchPrinterModelById(
  id: number,
): Promise<PrinterModelResponse> {
  return apiFetch<PrinterModelResponse>(`${BASE}/${id}`);
}

export async function createPrinterModel(
  body: PrinterModelRequest,
): Promise<PrinterModelResponse> {
  return apiFetch<PrinterModelResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updatePrinterModel(
  id: number,
  body: PrinterModelRequest,
): Promise<PrinterModelResponse> {
  return apiFetch<PrinterModelResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deletePrinterModel(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getPrinterModelsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "Solo un administrador puede gestionar modelos de impresora.";
    }
    if (error.status === 404) {
      return "Modelo de impresora no encontrado.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
