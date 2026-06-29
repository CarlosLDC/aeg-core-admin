import { logout } from "@/lib/auth";
import { FISCAL_BOOKS_APP_URL } from "@/lib/fiscal-books-app";
import {
  FISCAL_BOOK_ENTRY_PATH,
  getSafeRedirectPath,
} from "@/lib/safe-redirect";

export const FISCAL_BOOK_HANDOFF_PATH = "/auth/handoff";

/** Ruta destino dentro de la app de libros (p. ej. `/` o `/fiscal-book/42`). */
export function fiscalBooksTargetPath(pathSegments?: string[]): string {
  if (!pathSegments?.length) return "/";
  return `/fiscal-book/${pathSegments.map(encodeURIComponent).join("/")}`;
}

/** Convierte una ruta del panel (`/fiscal-book/...`) a ruta del portal de libros. */
export function adminPathToFiscalBooksTarget(adminPath: string): string {
  const normalized = getSafeRedirectPath(adminPath, FISCAL_BOOK_ENTRY_PATH);
  if (normalized === FISCAL_BOOK_ENTRY_PATH) return "/";
  if (normalized.startsWith(`${FISCAL_BOOK_ENTRY_PATH}/`)) {
    return normalized;
  }
  return "/";
}

/** URL de la app de libros que recibe el JWT en el fragmento (no viaja al servidor). */
export function fiscalBooksHandoffUrl(
  targetPath: string,
  token: string,
  remember: boolean,
): string {
  const handoff = new URL(FISCAL_BOOK_HANDOFF_PATH, FISCAL_BOOKS_APP_URL);
  const parts = [`token=${encodeURIComponent(token)}`];
  if (remember) parts.push("remember=1");

  const next = getSafeRedirectPath(targetPath, "/");
  if (next !== "/") {
    parts.push(`next=${encodeURIComponent(next)}`);
  }

  handoff.hash = parts.join("&");
  return handoff.toString();
}

/** Envía al libro fiscal con el JWT del panel (fragmento, no viaja al servidor). */
export function completeFiscalBooksHandoffFromAdmin(params: {
  token: string;
  remember: boolean;
  adminPath?: string;
  pathSegments?: string[];
  clearAdminSession?: boolean;
}): void {
  const target =
    params.pathSegments !== undefined
      ? fiscalBooksTargetPath(params.pathSegments)
      : adminPathToFiscalBooksTarget(
          params.adminPath ?? FISCAL_BOOK_ENTRY_PATH,
        );

  const url = fiscalBooksHandoffUrl(target, params.token, params.remember);
  if (params.clearAdminSession) {
    logout();
  }
  window.location.replace(url);
}

/** Envía al auditor al libro fiscal y deja el panel sin sesión activa. */
export function completeSeniatHandoffFromAdmin(params: {
  token: string;
  remember: boolean;
  adminPath?: string;
  pathSegments?: string[];
}): void {
  completeFiscalBooksHandoffFromAdmin({
    ...params,
    clearAdminSession: true,
  });
}
