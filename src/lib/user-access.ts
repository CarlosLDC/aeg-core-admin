import { FISCAL_BOOKS_APP_URL } from "@/lib/fiscal-books-app";
import { isDistributorPanelRole, type Role } from "@/types/user";

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
  return role !== "SENIAT" && role !== "SERVICE_CENTER";
}

export function userPortalAccessLabel(role: Role): string {
  if (role === "SENIAT") return "Solo libro fiscal";
  if (role === "SERVICE_CENTER") return "Solo libro fiscal (operaciones de campo)";
  return "Panel + libro fiscal";
}

export function userDistributorDisplayLabel(
  role: Role,
  distributorLabel: string | null | undefined,
): string {
  if (roleHasGlobalScope(role)) {
    return role === "SENIAT" ? "Global (auditoría)" : "Global (administrador)";
  }
  if (role === "SERVICE_CENTER") {
    return "Centro de servicio";
  }
  return distributorLabel?.trim() || "—";
}

export function userNationalIdDisplayLabel(
  role: Role,
  nationalId: string | null | undefined,
): string {
  if (!isDistributorPanelRole(role) && role !== "SERVICE_CENTER") return "—";
  return nationalId?.trim() || "—";
}

export function userFiscalBookWriteLabel(role: Role): string {
  if (role === "SENIAT") return "Solo lectura";
  if (role === "ADMIN") return "Escritura global";
  if (role === "SERVICE_CENTER") return "Servicios técnicos e inspecciones";
  if (role === "DISTRIBUTOR") return "Inspecciones anuales en alcance";
  if (role === "TECHNICIAN") return "Inspecciones y firma de servicios técnicos";
  return "Escritura en alcance";
}

export function userCreateSuccessMessage(name: string, role: Role): string {
  if (role === "SENIAT") {
    return `Usuario "${name}" creado. Ya puede iniciar sesión en aeg-tech.com para consultar el libro fiscal.`;
  }
  if (role === "SERVICE_CENTER") {
    return `Usuario "${name}" creado. Ya puede iniciar sesión en el libro fiscal para registrar visitas.`;
  }
  return `Usuario "${name}" creado. Ya puede iniciar sesión en el panel y en el libro fiscal.`;
}

export const FISCAL_BOOK_PORTAL_URL = FISCAL_BOOKS_APP_URL;
