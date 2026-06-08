import type { FiscalBookRole } from "@/types/fiscal-book-user";

export const FISCAL_BOOK_ROLE_LABELS: Record<FiscalBookRole, string> = {
  FISCAL_ADMIN: "Administrador libro fiscal",
  FISCAL_TECHNICIAN: "Técnico libro fiscal",
  FISCAL_AUDITOR: "Auditor SENIAT",
};

export const FISCAL_BOOK_ROLE_DESCRIPTIONS: Record<FiscalBookRole, string> = {
  FISCAL_ADMIN: "Consulta y operación completa en el portal de libros fiscales",
  FISCAL_TECHNICIAN: "Consulta y altas de servicios/inspecciones en el libro",
  FISCAL_AUDITOR: "Solo lectura del libro fiscal virtual",
};

export const FISCAL_BOOK_ROLE_STYLES: Record<FiscalBookRole, string> = {
  FISCAL_ADMIN: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  FISCAL_TECHNICIAN: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  FISCAL_AUDITOR: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};
