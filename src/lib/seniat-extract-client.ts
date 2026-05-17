import type { SeniatExtractResult } from "@/lib/seniat-extract";

export const SENIAT_SCAN_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export async function requestSeniatExtract(file: File): Promise<SeniatExtractResult> {
  const body = new FormData();
  body.append("file", file);

  const res = await fetch("/api/ai/seniat-extract", {
    method: "POST",
    body,
    credentials: "include",
  });

  const payload = (await res.json().catch(() => null)) as {
    data?: SeniatExtractResult;
    error?: string;
    code?: string;
  } | null;

  if (!res.ok) {
    const err = new Error(payload?.error ?? "No se pudo analizar el documento.");
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
