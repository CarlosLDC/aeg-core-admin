/**
 * URL del API Java en producción (DigitalOcean).
 * Sobrescribir con NEXT_PUBLIC_API_URL en Vercel o .env.local.
 */
export const DEFAULT_PRODUCTION_API_URL =
  "https://core-xgfvw.ondigitalocean.app";

const PRODUCTION_HOSTS = new Set([
  "aeg-core-admin.vercel.app",
  "aeg-admin.tech",
  "www.aeg-admin.tech",
]);

function isProductionHost(hostname: string): boolean {
  if (PRODUCTION_HOSTS.has(hostname)) return true;
  return hostname.endsWith(".vercel.app");
}

/** Resuelve la URL base del API (env > fallback en hosts de producción). */
export function resolveApiBaseUrl(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (
    typeof window !== "undefined" &&
    isProductionHost(window.location.hostname)
  ) {
    return DEFAULT_PRODUCTION_API_URL;
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_API_URL;
  }

  return null;
}

export function isApiConfigured(): boolean {
  return resolveApiBaseUrl() != null;
}

export function getApiDisplayLabel(): string {
  const url = resolveApiBaseUrl();
  if (!url) return "no configurada";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
