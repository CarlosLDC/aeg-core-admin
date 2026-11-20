import {
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobContentTypeNotAllowedError,
  BlobError,
  BlobFileTooLargeError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
} from "@vercel/blob";

export const BLOB_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const BLOB_ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function extractVercelBlobStoreId(
  token: string | undefined,
): string | null {
  if (!token) return null;
  const match = token.trim().match(/^vercel_blob_rw_([a-z0-9]+)_/i);
  return match ? match[1] : null;
}

export function detectAllowedFileMime(buffer: Buffer): string | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (buffer.length >= 6) {
    const gifHeader = buffer.subarray(0, 6).toString("ascii");
    if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
      return "image/gif";
    }
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function blobUploadErrorMessage(error: unknown): string {
  if (error instanceof BlobClientTokenExpiredError) {
    return "El servicio de almacenamiento requiere renovación de credenciales.";
  }
  if (error instanceof BlobStoreNotFoundError) {
    return "El almacenamiento de documentos no está disponible.";
  }
  if (error instanceof BlobStoreSuspendedError) {
    return "El almacenamiento de documentos está temporalmente suspendido.";
  }
  if (error instanceof BlobContentTypeNotAllowedError) {
    return "Tipo de archivo no permitido en el almacenamiento.";
  }
  if (error instanceof BlobFileTooLargeError) {
    return "El archivo supera el límite del almacenamiento.";
  }
  if (error instanceof BlobAccessError) {
    return "Sin permiso para acceder al almacenamiento de documentos.";
  }
  if (error instanceof BlobError) {
    return "Error en el servicio de almacenamiento de documentos.";
  }
  return "Error al procesar el archivo en el almacenamiento.";
}

export function resolveBlobContentType(file: File): string | null {
  const contentType = file.type || "application/octet-stream";
  if (BLOB_ALLOWED_CONTENT_TYPES.has(contentType)) return contentType;

  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return null;
}
