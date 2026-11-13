import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type { ModificationRequestStatus } from "@/types/client-modification-request";
import type {
  PrinterEnajenacionApproveRequest,
  PrinterEnajenacionCreateRequest,
  PrinterEnajenacionRejectRequest,
  PrinterEnajenacionRequestDetailResponse,
  PrinterEnajenacionRequestListItemResponse,
} from "@/types/printer-enajenacion-request";

const BASE = "/api/printer-enajenacion-requests";

export async function createPrinterEnajenacionRequest(
  payload: PrinterEnajenacionCreateRequest,
): Promise<PrinterEnajenacionRequestDetailResponse> {
  return apiFetch<PrinterEnajenacionRequestDetailResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchPrinterEnajenacionRequests(
  status?: ModificationRequestStatus,
): Promise<PrinterEnajenacionRequestListItemResponse[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<PrinterEnajenacionRequestListItemResponse[]>(`${BASE}${query}`);
}

export async function fetchPendingPrinterEnajenacionRequest(
  printerId: number,
): Promise<PrinterEnajenacionRequestDetailResponse | null> {
  try {
    const res = await apiFetch<PrinterEnajenacionRequestDetailResponse | null>(
      `${BASE}/pending?printerId=${printerId}`,
    );
    return res ?? null;
  } catch {
    return null;
  }
}

export async function fetchPrinterEnajenacionRequestById(
  id: number,
): Promise<PrinterEnajenacionRequestDetailResponse> {
  return apiFetch<PrinterEnajenacionRequestDetailResponse>(`${BASE}/${id}`);
}

export async function approvePrinterEnajenacionRequest(
  id: number,
  payload: PrinterEnajenacionApproveRequest,
): Promise<PrinterEnajenacionRequestDetailResponse> {
  return apiFetch<PrinterEnajenacionRequestDetailResponse>(
    `${BASE}/${id}/approve`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function rejectPrinterEnajenacionRequest(
  id: number,
  payload?: PrinterEnajenacionRejectRequest,
): Promise<PrinterEnajenacionRequestDetailResponse> {
  return apiFetch<PrinterEnajenacionRequestDetailResponse>(
    `${BASE}/${id}/reject`,
    {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    },
  );
}

export async function cancelPrinterEnajenacionRequest(
  id: number,
): Promise<PrinterEnajenacionRequestDetailResponse> {
  return apiFetch<PrinterEnajenacionRequestDetailResponse>(
    `${BASE}/${id}/cancel`,
    {
      method: "POST",
    },
  );
}

export function getPrinterEnajenacionRequestsErrorMessage(
  error: unknown,
): string {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return "La solicitud de permiso de enajenación no existe o ya fue resuelta.";
    }
    if (error.status === 403) {
      return "No tienes permisos para realizar esta acción.";
    }
    return error.message;
  }
  if (error instanceof TypeError) return "No se pudo conectar con el servidor.";
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "No se pudo procesar la solicitud de permiso de enajenación.";
}
