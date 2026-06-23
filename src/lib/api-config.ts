/**
 * URL del API Java (DigitalOcean). El proxy de Next reescribe /api/* hacia aquí.
 * Sobrescribir con API_UPSTREAM_URL en Vercel o NEXT_PUBLIC_API_URL en desarrollo directo.
 */
export const DEFAULT_PRODUCTION_API_URL =
  "https://core-xgfvw.ondigitalocean.app";

const PRODUCTION_HOSTS = new Set([
  "aeg-core-admin.vercel.app",
  "aeg-admin.tech",
  "www.aeg-admin.tech",
  "aeg-tech.com",
  "www.aeg-tech.com",
]);

function isProductionHost(hostname: string): boolean {
  if (PRODUCTION_HOSTS.has(hostname)) return true;
  return hostname.endsWith(".vercel.app");
}

/** En el navegador del panel desplegado usamos proxy same-origin (/api → backend). */
export function shouldUseSameOriginApiProxy(): boolean {
  if (process.env.NEXT_PUBLIC_USE_API_PROXY === "true") return true;
  if (typeof window !== "undefined") {
    return isProductionHost(window.location.hostname);
  }
  return false;
}

function upstreamFromEnv(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.API_UPSTREAM_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/**
 * Base URL para fetch.
 * - Cliente en producción: "" → rutas relativas /api/... (proxy Next, sin CORS).
 * - Servidor / desarrollo: URL absoluta del backend.
 */
export function resolveApiBaseUrl(): string | null {
  if (typeof window !== "undefined" && shouldUseSameOriginApiProxy()) {
    return "";
  }

  const fromEnv = upstreamFromEnv();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_API_URL;
  }

  return null;
}

export function isApiConfigured(): boolean {
  return resolveApiBaseUrl() !== null;
}

export function getApiDisplayLabel(): string {
  if (typeof window !== "undefined" && shouldUseSameOriginApiProxy()) {
    try {
      const upstream = upstreamFromEnv() ?? DEFAULT_PRODUCTION_API_URL;
      return `${window.location.host} → ${new URL(upstream).host}`;
    } catch {
      return `${window.location.host} (proxy)`;
    }
  }

  const url = resolveApiBaseUrl();
  if (url === null) return "no configurada";
  if (url === "") return "proxy local";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
