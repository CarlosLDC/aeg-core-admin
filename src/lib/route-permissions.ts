import { mainNav } from "@/lib/navigation";
import { ROLES, type Role } from "@/types/user";

const rolesByPath = new Map<string, Role[] | undefined>(
  mainNav.map((item) => [item.href, item.roles]),
);

/**
 * Roles permitidos para una ruta del panel.
 * `null` = cualquier usuario autenticado.
 */
export function allowedRolesForPath(path: string): Role[] | null {
  const normalized =
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  if (!rolesByPath.has(normalized)) return null;
  const roles = rolesByPath.get(normalized);
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
  const normalized =
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  return rolesByPath.has(normalized);
}

export { ROLES };
