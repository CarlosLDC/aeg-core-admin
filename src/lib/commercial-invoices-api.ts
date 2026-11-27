import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  CommercialInvoicePrintersRequest,
  CommercialInvoiceRequest,
  CommercialInvoiceResponse,
} from "@/types/commercial-invoice";

const BASE = "/api/commercial-invoices";

export async function fetchCommercialInvoices(): Promise<
  CommercialInvoiceResponse[]
> {
  return apiFetch<CommercialInvoiceResponse[]>(BASE);
}

export async function fetchCommercialInvoiceById(
  id: number,
): Promise<CommercialInvoiceResponse> {
  return apiFetch<CommercialInvoiceResponse>(`${BASE}/${id}`);
}

export async function createCommercialInvoice(
  body: CommercialInvoiceRequest,
): Promise<CommercialInvoiceResponse> {
  return apiFetch<CommercialInvoiceResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCommercialInvoice(
  id: number,
  body: CommercialInvoiceRequest,
): Promise<CommercialInvoiceResponse> {
  return apiFetch<CommercialInvoiceResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteCommercialInvoice(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export async function syncCommercialInvoicePrinters(
  id: number,
  printerIds: number[],
): Promise<CommercialInvoiceResponse> {
  const body: CommercialInvoicePrintersRequest = { printerIds };
  return apiFetch<CommercialInvoiceResponse>(`${BASE}/${id}/printers`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function unlinkCommercialInvoicePrinter(
  id: number,
  printerId: number,
): Promise<CommercialInvoiceResponse> {
  return apiFetch<CommercialInvoiceResponse>(
    `${BASE}/${id}/printers/${printerId}`,
    { method: "DELETE" },
  );
}

export async function markCommercialInvoiceAsPaid(
  id: number,
): Promise<CommercialInvoiceResponse> {
  return apiFetch<CommercialInvoiceResponse>(`${BASE}/${id}/mark-paid`, {
    method: "POST",
  });
}

export function getCommercialInvoicesErrorMessage(
  error: unknown,
  fallback = "Ha ocurrido un error inesperado.",
): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "No tienes permiso para gestionar órdenes.";
    }
    if (error.status === 404) return "Orden no encontrada.";
    if (error.status === 400) {
      return error.message || "Datos de la orden no válidos.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return fallback;
}
