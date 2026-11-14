import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  CommercialPaymentRequest,
  CommercialPaymentResponse,
} from "@/types/commercial-payment";

const BASE = "/api/commercial-payments";

export async function fetchCommercialPayments(
  facturaComercialId?: number,
): Promise<CommercialPaymentResponse[]> {
  const query =
    facturaComercialId != null
      ? `?facturaComercialId=${encodeURIComponent(String(facturaComercialId))}`
      : "";
  return apiFetch<CommercialPaymentResponse[]>(`${BASE}${query}`);
}

export async function fetchCommercialPaymentById(
  id: number,
): Promise<CommercialPaymentResponse> {
  return apiFetch<CommercialPaymentResponse>(`${BASE}/${id}`);
}

export async function createCommercialPayment(
  body: CommercialPaymentRequest,
): Promise<CommercialPaymentResponse> {
  return apiFetch<CommercialPaymentResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCommercialPayment(
  id: number,
  body: CommercialPaymentRequest,
): Promise<CommercialPaymentResponse> {
  return apiFetch<CommercialPaymentResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteCommercialPayment(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getCommercialPaymentsErrorMessage(
  error: unknown,
  fallback = "Ha ocurrido un error inesperado.",
): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "No tienes permiso para gestionar pagos comerciales.";
    }
    if (error.status === 404) return "Pago comercial no encontrado.";
    if (error.status === 400) {
      return error.message || "Datos del pago comercial no válidos.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return fallback;
}
