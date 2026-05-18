import { mainNav } from "@/lib/navigation";
import { ROLES, type Role } from "@/types/user";

const rolesByPath = new Map<string, Role[] | undefined>(
  mainNav.map((item) => [item.href, item.roles]),
);

/**
 * Roles permitidos para una ruta del panel.
 * `null` = cualquier usuario autenticado.
 */
function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/** Resuelve permisos de rutas anidadas (/companies/12 → /companies). */
function resolveNavPath(path: string): string | null {
  const normalized = normalizePath(path);
  if (rolesByPath.has(normalized)) return normalized;

  let current = normalized;
  while (current.includes("/")) {
    const parent = current.replace(/\/[^/]+$/, "");
    if (!parent || parent === current) break;
    if (rolesByPath.has(parent)) return parent;
    current = parent;
  }
  return null;
}

export function allowedRolesForPath(path: string): Role[] | null {
  const navPath = resolveNavPath(path);
  if (!navPath) return null;
  const roles = rolesByPath.get(navPath);
  if (!roles) return null;
  return roles;
}

export function canAccessPath(path: string, role: Role): boolean {
  const allowed = allowedRolesForPath(path);
  if (!allowed) return true;
  return allowed.includes(role);
}

/** Primera ruta del menú a la que el rol puede acceder (fallback tras denegar). */
export function defaultPathForRole(role: Role): string {
  for (const item of mainNav) {
    if (item.disabled) continue;
    if (!item.roles || item.roles.includes(role)) {
      return item.href;
    }
  }
  return "/";
}

export function isKnownAppPath(path: string): boolean {
  return resolveNavPath(path) != null;
}

export { ROLES };
