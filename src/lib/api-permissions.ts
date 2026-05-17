import type { Role } from "@/types/user";

/** POST en catálogos operativos (empresas, sucursales, clientes, etc.). */
export function canCreateCatalogRecord(role: Role): boolean {
  return role === "ADMIN";
}

/** POST en impresoras (roles operativos con acceso al módulo). */
export function canCreatePrinterRecord(role: Role): boolean {
  return role === "ADMIN" || role === "DISTRIBUTOR" || role === "TECHNICIAN";
}

/** PUT/DELETE en impresoras. */
export function canModifyPrinterRecord(role: Role): boolean {
  return role === "ADMIN";
}

/** PUT en catálogos operativos. */
export function canUpdateCatalogRecord(role: Role): boolean {
  return role === "ADMIN";
}

/** DELETE en catálogos operativos. */
export function canDeleteCatalogRecord(role: Role): boolean {
  return role === "ADMIN";
}

/** Alias: modificar o eliminar registros existentes (PUT/DELETE). */
export function canModifyCatalogRecord(role: Role): boolean {
  return canUpdateCatalogRecord(role);
}

export const CATALOG_CREATE_FORBIDDEN_MESSAGE =
  "Solo un administrador puede crear registros.";

export const CATALOG_UPDATE_FORBIDDEN_MESSAGE =
  "Solo un administrador puede modificar registros existentes.";

export const CATALOG_DELETE_FORBIDDEN_MESSAGE =
  "Solo un administrador puede eliminar registros.";

export const CATALOG_MODIFY_FORBIDDEN_MESSAGE =
  "Solo un administrador puede modificar o eliminar registros.";

export function getCatalogForbiddenMessage(
  method: "PUT" | "DELETE" | "MODIFY",
): string {
  if (method === "PUT") return CATALOG_UPDATE_FORBIDDEN_MESSAGE;
  if (method === "DELETE") return CATALOG_DELETE_FORBIDDEN_MESSAGE;
  return CATALOG_MODIFY_FORBIDDEN_MESSAGE;
}
