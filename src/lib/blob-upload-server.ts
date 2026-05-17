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

export function blobUploadErrorMessage(error: unknown): string {
  if (error instanceof BlobClientTokenExpiredError) {
    return "El token de almacenamiento expiró. Vuelve a desplegar o actualiza BLOB_READ_WRITE_TOKEN en Vercel.";
  }
  if (error instanceof BlobStoreNotFoundError) {
    return "No hay un Blob Store vinculado al proyecto. Créalo en Vercel → Storage y redeploy.";
  }
  if (error instanceof BlobStoreSuspendedError) {
    return "El almacenamiento está suspendido. Revisa el panel de Vercel Blob.";
  }
  if (error instanceof BlobContentTypeNotAllowedError) {
    return "Tipo de archivo no permitido en el store de Blob.";
  }
  if (error instanceof BlobFileTooLargeError) {
    return "El archivo supera el límite del almacenamiento.";
  }
  if (error instanceof BlobAccessError) {
    return "Sin permiso para escribir en Blob. Comprueba BLOB_READ_WRITE_TOKEN.";
  }
  if (error instanceof BlobError) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Error al guardar el archivo en el almacenamiento.";
}

export function resolveBlobContentType(file: File): string | null {
  let contentType = file.type || "application/octet-stream";
  if (BLOB_ALLOWED_CONTENT_TYPES.has(contentType)) return contentType;

  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return null;
}
