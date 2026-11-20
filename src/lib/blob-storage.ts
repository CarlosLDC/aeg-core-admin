const BLOB_HOST = /\.blob\.vercel-storage\.com$/i;

export function isVercelBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && BLOB_HOST.test(parsed.hostname);
  } catch {
    return false;
  }
}

export function isVercelBlobUrlForStore(
  url: string,
  storeId: string | null,
): boolean {
  if (!isVercelBlobUrl(url)) return false;
  if (!storeId) return true;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.startsWith(`${storeId.toLowerCase()}.`);
  } catch {
    return false;
  }
}

export function blobAccessForUrl(url: string): "private" | "public" {
  try {
    return new URL(url).hostname.includes(".private.blob.vercel-storage.com")
      ? "private"
      : "public";
  } catch {
    return "private";
  }
}

/** URL para ver/descargar un blob (público o privado) desde el admin autenticado. */
export function blobViewUrl(storedUrl: string): string {
  if (typeof storedUrl !== "string") return "#";
  const trimmed = storedUrl.trim();
  if (!trimmed) return "#";

  if (isVercelBlobUrl(trimmed)) {
    return `/api/uploads/documents?url=${encodeURIComponent(trimmed)}`;
  }

  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes("\\") &&
    !/[\u0000-\u001F\u007F]/.test(trimmed)
  ) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return trimmed;
    }
  } catch {
    // Reject malformed or dangerous schemes (e.g. javascript:, data:, vbscript:)
  }

  return "#";
}
