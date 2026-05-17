/** Rutas internas permitidas tras login (evita open redirect). */
const DEFAULT_PATH = "/";

export function getSafeRedirectPath(
  raw: string | null | undefined,
  fallback = DEFAULT_PATH,
): string {
  if (!raw) return fallback;

  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  if (trimmed.includes("://") || trimmed.includes("\\")) {
    return fallback;
  }

  if (trimmed.startsWith("/login")) {
    return fallback;
  }

  return trimmed;
}
