import { mainNav } from "@/lib/navigation";
import { can } from "@/lib/permissions/can";
import type { Resource } from "@/lib/permissions/types";
import type { Role } from "@/types/user";

/** Ruta → recurso para comprobar permiso read. */
const ROUTE_RESOURCE: Array<{ prefix: string; resource: Resource }> = [
  { prefix: "/clients", resource: "branches" },
  { prefix: "/companies", resource: "companies" },
  { prefix: "/branches", resource: "branches" },
  { prefix: "/employees", resource: "employees" },
  { prefix: "/printers", resource: "printers" },
  { prefix: "/printer-models", resource: "printerModels" },
  { prefix: "/seals", resource: "seals" },
  { prefix: "/technical-services", resource: "technicalServices" },
  { prefix: "/annual-inspections", resource: "annualInspections" },
  { prefix: "/contracts", resource: "contracts" },
  { prefix: "/users", resource: "users" },
  { prefix: "/mqtt-tests", resource: "mqtt" },
  { prefix: "/settings/permissions", resource: "users" },
  { prefix: "/settings", resource: "dashboard" },
];

const rolesByPath = new Map<string, Role[] | undefined>(
  mainNav.map((item) => [item.href, item.roles]),
);

function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

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

export function resourceForPath(pathname: string): Resource {
  const normalized = normalizePath(pathname);
  if (normalized === "/" || normalized === "") return "dashboard";

  for (const { prefix, resource } of ROUTE_RESOURCE) {
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return resource;
    }
  }
  return "dashboard";
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  const normalized = normalizePath(pathname);
  if (normalized === "/login") return true;

  const resource = resourceForPath(normalized);
  if (!can(role, resource, "read")) return false;

  const navPath = resolveNavPath(normalized);
  if (navPath) {
    const navRoles = rolesByPath.get(navPath);
    if (navRoles && !navRoles.includes(role)) {
      const isDetailRoute =
        normalized !== navPath && normalized.startsWith(`${navPath}/`);
      if (!isDetailRoute) return false;
      // Detalle de sucursal sin listado en menú (distribuidor usa /clients).
      if (navPath === "/branches" && role === "DISTRIBUTOR") return true;
      // Detalle de empresa de cliente desde flujo de distribuidor.
      if (navPath === "/companies" && role === "DISTRIBUTOR") return true;
      return false;
    }
  }

  return true;
}

/** Primera ruta del menú a la que el rol puede acceder (fallback tras denegar). */
export function defaultPathForRole(role: Role): string {
  for (const item of mainNav) {
    if (item.disabled) continue;
    if (!item.roles || item.roles.includes(role)) {
      if (can(role, resourceForPath(item.href), "read")) {
        return item.href;
      }
    }
  }
  return "/";
}

export function allowedRolesForPath(path: string): Role[] | null {
  const navPath = resolveNavPath(path);
  if (!navPath) return null;
  const roles = rolesByPath.get(navPath);
  if (!roles) return null;
  return [...roles];
}

export function isKnownAppPath(path: string): boolean {
  const normalized = normalizePath(path);
  if (normalized === "/" || normalized === "/login") return true;
  return resolveNavPath(normalized) != null || ROUTE_RESOURCE.some(
    ({ prefix }) =>
      normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}
