import { getStoredToken } from "@/lib/auth-storage";
import type { BlobUploadFolder } from "@/lib/blob-upload-categories";
import { blobViewUrl, isVercelBlobUrl } from "@/lib/blob-storage";

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

export async function fetchBlobDocumentBlob(
  storedUrl: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const viewUrl = blobViewUrl(storedUrl);
  if (viewUrl === "#") {
    throw new Error("URL de documento no válida.");
  }

  const headers: HeadersInit = {};
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(viewUrl, {
    method: "GET",
    headers,
    credentials: "include",
    signal,
  });

  if (!res.ok) {
    throw new Error("No se pudo cargar el documento.");
  }

  return res.blob();
}

function triggerAnchorNavigation(
  href: string,
  downloadFilename?: string,
): void {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  if (downloadFilename) {
    anchor.download = downloadFilename;
  }
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function openBlobDocument(
  storedUrl: string,
  options?: { downloadFilename?: string },
): Promise<void> {
  const viewUrl = blobViewUrl(storedUrl);
  if (viewUrl === "#") return;

  if (!isVercelBlobUrl(storedUrl)) {
    triggerAnchorNavigation(viewUrl, options?.downloadFilename);
    return;
  }

  const blob = await fetchBlobDocumentBlob(storedUrl);
  const objectUrl = URL.createObjectURL(blob);
  triggerAnchorNavigation(objectUrl, options?.downloadFilename);
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);
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

  const headers: HeadersInit = {};
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch("/api/uploads/documents", {
    method: "POST",
    headers,
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
