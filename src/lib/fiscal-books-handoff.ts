import { FISCAL_BOOKS_APP_URL } from "@/lib/fiscal-books-app";
import { getSafeRedirectPath } from "@/lib/safe-redirect";

export const FISCAL_BOOK_HANDOFF_PATH = "/auth/handoff";

/** Ruta destino dentro de la app de libros (p. ej. `/` o `/fiscal-book/42`). */
export function fiscalBooksTargetPath(pathSegments?: string[]): string {
  if (!pathSegments?.length) return "/";
  return `/fiscal-book/${pathSegments.map(encodeURIComponent).join("/")}`;
}

/** URL de la app de libros que recibe el JWT en el fragmento (no viaja al servidor). */
export function fiscalBooksHandoffUrl(
  targetPath: string,
  token: string,
  remember: boolean,
): string {
  const handoff = new URL(FISCAL_BOOK_HANDOFF_PATH, FISCAL_BOOKS_APP_URL);
  const hash = new URLSearchParams();
  hash.set("token", token);
  if (remember) hash.set("remember", "1");

  const next = getSafeRedirectPath(targetPath, "/");
  if (next !== "/") {
    hash.set("next", next);
  }

  handoff.hash = hash.toString();
  return handoff.toString();
}
