import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  PrinterCreditPaymentRequest,
  PrinterCreditPlanRequest,
  PrinterCreditSummaryResponse,
} from "@/types/printer-credit";

export async function fetchPrinterCreditSummary(
  printerId: number,
): Promise<PrinterCreditSummaryResponse> {
  return apiFetch<PrinterCreditSummaryResponse>(
    `/api/printers/${printerId}/credit-payments`,
  );
}

export async function updatePrinterCreditPlan(
  printerId: number,
  payload: PrinterCreditPlanRequest,
): Promise<PrinterCreditSummaryResponse> {
  return apiFetch<PrinterCreditSummaryResponse>(
    `/api/printers/${printerId}/credit-plan`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function registerPrinterCreditPayment(
  printerId: number,
  payload: PrinterCreditPaymentRequest,
): Promise<PrinterCreditSummaryResponse> {
  return apiFetch<PrinterCreditSummaryResponse>(
    `/api/printers/${printerId}/credit-payments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function deletePrinterCreditPayment(
  printerId: number,
  paymentId: number,
): Promise<PrinterCreditSummaryResponse> {
  return apiFetch<PrinterCreditSummaryResponse>(
    `/api/printers/${printerId}/credit-payments/${paymentId}`,
    {
      method: "DELETE",
    },
  );
}

export function getPrinterCreditErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "La impresora o el pago seleccionado no existe.";
    }
    if (error.status === 403) {
      return "Solo un administrador puede gestionar cuotas y pagos a crédito.";
    }
    return error.message;
  }
  if (error instanceof TypeError) return "No se pudo conectar con el servidor.";
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "No se pudo actualizar la información de crédito de la impresora.";
}
