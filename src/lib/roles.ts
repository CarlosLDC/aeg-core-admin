import type { Role } from "@/types/user";

/** Roles que se muestran en el formulario de usuarios pero no se pueden asignar (por ahora). */
export const USER_ROLES_NOT_ASSIGNABLE: Role[] = [
  "TECHNICIAN",
  "SERVICE_CENTER",
];

export function isUserRoleAssignable(
  role: Role,
  currentRole?: Role,
): boolean {
  if (!USER_ROLES_NOT_ASSIGNABLE.includes(role)) return true;
  return currentRole === role;
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  DISTRIBUTOR: "Distribuidor",
  TECHNICIAN: "Técnico",
  SERVICE_CENTER: "Centro de servicio",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Acceso completo al panel y endpoints /api/admin/**",
  DISTRIBUTOR: "Sucursales, clientes y personas distribuidor",
  TECHNICIAN: "Impresoras, sellos e inspecciones",
  SERVICE_CENTER: "Sellos, servicios técnicos e inspecciones",
};

export const ROLE_STYLES: Record<Role, string> = {
  ADMIN: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  DISTRIBUTOR: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  TECHNICIAN: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  SERVICE_CENTER: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};
