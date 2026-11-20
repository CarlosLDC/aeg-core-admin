import type { Role } from "@/types/user";

/** Entrada al portal de libros fiscales (rewrite/redirect en Next). */
export const FISCAL_BOOK_ENTRY_PATH = "/fiscal-book";

/** Rutas internas permitidas tras login (evita open redirect). */
const DEFAULT_PATH = "/";

const BLOCKED_AUTH_PREFIXES = [
  "/login",
  "/accept-invite",
  "/forgot-password",
  "/reset-password",
];

export function postLoginRedirectPath(
  role: Role,
  raw: string | null | undefined,
): string {
  if (role === "SENIAT" || role === "TECHNICIAN" || role === "SERVICE_CENTER") {
    return FISCAL_BOOK_ENTRY_PATH;
  }
  return getSafeRedirectPath(raw);
}

export function getSafeRedirectPath(
  raw: string | null | undefined,
  fallback = DEFAULT_PATH,
): string {
  if (!raw) return fallback;

  const trimmed = raw.trim();
  if (!trimmed || /[\u0000-\u001F\u007F\\]/.test(trimmed)) {
    return fallback;
  }

  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, "https://internal.invalid");
    if (
      parsed.origin !== "https://internal.invalid" ||
      !parsed.pathname.startsWith("/") ||
      parsed.pathname.startsWith("//")
    ) {
      return fallback;
    }

    if (
      BLOCKED_AUTH_PREFIXES.some(
        (prefix) =>
          parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
      )
    ) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
