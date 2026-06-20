import type { Role } from "@/types/user";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  TECHNICIAN: "Técnico",
  SENIAT: "Auditor SENIAT",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Acceso completo a todas las secciones del panel",
  TECHNICIAN:
    "Operaciones de distribuidora: clientes, impresoras, precintos e inspecciones",
  SENIAT: "Solo lectura del libro fiscal (sin acceso al panel)",
};

export const ROLE_STYLES: Record<Role, string> = {
  ADMIN: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  TECHNICIAN: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  SENIAT: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};
