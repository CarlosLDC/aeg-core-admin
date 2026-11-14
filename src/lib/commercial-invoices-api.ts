import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  CommercialClientRequest,
  CommercialClientResponse,
  CommercialInvoiceRequest,
  CommercialInvoiceResponse,
} from "@/types/commercial-invoice";

const BASE = "/api/commercial-invoices";
const CLIENTS_BASE = "/api/commercial-clients";

export async function fetchCommercialClients(): Promise<
  CommercialClientResponse[]
> {
  return apiFetch<CommercialClientResponse[]>(CLIENTS_BASE);
}

export async function createCommercialClient(
  body: CommercialClientRequest,
): Promise<CommercialClientResponse> {
  return apiFetch<CommercialClientResponse>(CLIENTS_BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

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

export function getCommercialInvoicesErrorMessage(
  error: unknown,
  fallback = "Ha ocurrido un error inesperado.",
): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "No tienes permiso para gestionar facturas comerciales.";
    }
    if (error.status === 404) return "Factura comercial no encontrada.";
    if (error.status === 400) {
      return error.message || "Datos de la factura comercial no válidos.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return fallback;
}
