import type { Role } from "@/types/user";

/** Entrada al portal de libros fiscales (rewrite/redirect en Next). */
export const FISCAL_BOOK_ENTRY_PATH = "/fiscal-book";

/** Rutas internas permitidas tras login (evita open redirect). */
const DEFAULT_PATH = "/";

export function postLoginRedirectPath(
  role: Role,
  raw: string | null | undefined,
): string {
  if (role === "SENIAT") return FISCAL_BOOK_ENTRY_PATH;
  return getSafeRedirectPath(raw);
}

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
