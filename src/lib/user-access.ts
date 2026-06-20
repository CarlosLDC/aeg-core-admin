import { FISCAL_BOOKS_APP_URL } from "@/lib/fiscal-books-app";
import type { Role } from "@/types/user";

export type UserAccessKind = "operativo" | "admin" | "seniat";

export function userAccessKind(role: Role): UserAccessKind {
  if (role === "ADMIN") return "admin";
  if (role === "SENIAT") return "seniat";
  return "operativo";
}

export function roleHasGlobalScope(role: Role): boolean {
  return role === "ADMIN" || role === "SENIAT";
}

export function canAccessPanel(role: Role): boolean {
  return role !== "SENIAT";
}

export function userPortalAccessLabel(role: Role): string {
  return role === "SENIAT" ? "Solo libro fiscal" : "Panel + libro fiscal";
}

export function userDistributorDisplayLabel(
  role: Role,
  distributorLabel: string | null | undefined,
): string {
  if (roleHasGlobalScope(role)) {
    return role === "SENIAT" ? "Global (auditoría)" : "Global (administrador)";
  }
  return distributorLabel?.trim() || "—";
}

export function userNationalIdDisplayLabel(
  role: Role,
  nationalId: string | null | undefined,
): string {
  if (role !== "TECHNICIAN") return "—";
  return nationalId?.trim() || "—";
}

export function userFiscalBookWriteLabel(role: Role): string {
  if (role === "SENIAT") return "Solo lectura";
  if (role === "ADMIN") return "Escritura global";
  return "Escritura en alcance";
}

export function userCreateSuccessMessage(name: string, role: Role): string {
  if (role === "SENIAT") {
    return `Usuario "${name}" creado. Ya puede iniciar sesión en el libro fiscal.`;
  }
  return `Usuario "${name}" creado. Ya puede iniciar sesión en el panel y en el libro fiscal.`;
}

export const FISCAL_BOOK_PORTAL_URL = FISCAL_BOOKS_APP_URL;
