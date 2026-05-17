const BLOB_HOST = /\.blob\.vercel-storage\.com$/i;

export function isVercelBlobUrl(url: string): boolean {
  try {
    return BLOB_HOST.test(new URL(url).hostname);
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
  if (!isVercelBlobUrl(storedUrl)) return storedUrl;
  return `/api/uploads/documents?url=${encodeURIComponent(storedUrl)}`;
}
