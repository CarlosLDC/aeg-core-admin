import type { ContractKind } from "@/types/contract";

export const CONTRACT_DOCUMENT_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/gif";

export const CONTRACT_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isContractDocumentMime(type: string): boolean {
  return ALLOWED_MIME.has(type);
}

export function validateContractDocumentFile(file: File): string | null {
  if (!isContractDocumentMime(file.type)) {
    return "Solo se permiten PDF o imágenes (JPG, PNG, WebP, GIF).";
  }
  if (file.size > CONTRACT_DOCUMENT_MAX_BYTES) {
    return "Cada archivo debe pesar como máximo 10 MB.";
  }
  return null;
}

export function contractDocumentLabel(url: string): string {
  try {
    const name = new URL(url).pathname.split("/").pop() ?? url;
    return decodeURIComponent(name.replace(/^\d+-/, ""));
  } catch {
    return "Documento";
  }
}

export function isPdfUrl(url: string): boolean {
  return /\.pdf($|\?)/i.test(url) || url.toLowerCase().includes("application/pdf");
}

export async function uploadContractDocument(
  file: File,
  kind: ContractKind,
): Promise<string> {
  const validation = validateContractDocumentFile(file);
  if (validation) throw new Error(validation);

  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);

  const res = await fetch("/api/uploads/contract-documents", {
    method: "POST",
    body,
    credentials: "include",
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(data?.message ?? "No se pudo subir el archivo.");
  }

  const data = (await res.json()) as { url: string };
  if (!data.url) throw new Error("Respuesta de subida inválida.");
  return data.url;
}
