import type { Role } from "@/types/user";

export const FISCAL_BOOKS_APP_URL = "https://aeg-libros-fiscales.vercel.app";

export const FISCAL_BOOKS_ROLES = [
  "ADMIN",
  "DISTRIBUTOR",
  "TECHNICIAN",
  "SERVICE_CENTER",
] as const satisfies readonly Role[];

export function canAccessFiscalBooksApp(role: Role): boolean {
  return (FISCAL_BOOKS_ROLES as readonly Role[]).includes(role);
}

export function fiscalBooksAppUrl(printerId?: number): string {
  if (printerId == null) return FISCAL_BOOKS_APP_URL;
  return `${FISCAL_BOOKS_APP_URL}/fiscal-book/${printerId}`;
}

export function isExternalNavHref(href: string): boolean {
  return href.startsWith("https://") || href.startsWith("http://");
}
