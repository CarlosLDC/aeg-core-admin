import type { BlobUploadFolder } from "@/lib/blob-upload-categories";
import { blobViewUrl } from "@/lib/blob-storage";

export { blobViewUrl as documentViewUrl };

export const BLOB_DOCUMENT_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/gif";

export const BLOB_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function resolveDocumentMime(file: File): string | null {
  if (ALLOWED_MIME.has(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return null;
}

export function validateBlobDocumentFile(file: File): string | null {
  if (!resolveDocumentMime(file)) {
    return "Solo se permiten PDF o imágenes (JPG, PNG, WebP, GIF).";
  }
  if (file.size > BLOB_DOCUMENT_MAX_BYTES) {
    return "Cada archivo debe pesar como máximo 10 MB.";
  }
  return null;
}

export function blobDocumentLabel(url: string): string {
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

export async function uploadBlobDocument(
  file: File,
  folder: BlobUploadFolder,
): Promise<string> {
  const validation = validateBlobDocumentFile(file);
  if (validation) throw new Error(validation);

  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);

  const res = await fetch("/api/uploads/documents", {
    method: "POST",
    body,
    credentials: "include",
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;
    throw new Error(
      data?.error ?? data?.message ?? "No se pudo subir el archivo.",
    );
  }

  const data = (await res.json()) as { url: string };
  if (!data.url) throw new Error("Respuesta de subida inválida.");
  return data.url;
}
