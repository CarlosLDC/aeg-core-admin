import { getStoredToken } from "@/lib/auth-storage";
import type { PaymentExtractResult } from "@/lib/payment-extract";

export const PAYMENT_SCAN_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export async function requestPaymentExtract(file: File): Promise<PaymentExtractResult> {
  const body = new FormData();
  body.append("file", file);

  const headers: HeadersInit = {};
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch("/api/ai/payment-extract", {
    method: "POST",
    headers,
    body,
    credentials: "include",
  });

  const payload = (await res.json().catch(() => null)) as {
    data?: PaymentExtractResult;
    error?: string;
    code?: string;
  } | null;

  if (!res.ok) {
    const err = new Error(payload?.error ?? "No se pudo analizar el comprobante.");
    if (payload?.code) {
      (err as Error & { code?: string }).code = payload.code;
    }
    throw err;
  }

  if (!payload?.data) {
    throw new Error("Respuesta de análisis inválida.");
  }

  return payload.data;
}
