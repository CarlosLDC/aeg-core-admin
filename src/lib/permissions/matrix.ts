import type { Action, PermissionMatrix, Resource } from "@/lib/permissions/types";
import type { Role } from "@/types/user";

const ADMIN_ONLY = ["ADMIN"] as const;
const ADMIN_DIST = ["ADMIN", "DISTRIBUTOR"] as const;
const ADMIN_DIST_TECH = ["ADMIN", "DISTRIBUTOR", "TECHNICIAN"] as const;
const FIELD_OPS = ["ADMIN", "TECHNICIAN", "SERVICE_CENTER"] as const;
const FIELD_OPS_DIST = [
  "ADMIN",
  "DISTRIBUTOR",
  "TECHNICIAN",
  "SERVICE_CENTER",
] as const;
const ALL_ROLES = [
  "ADMIN",
  "DISTRIBUTOR",
  "TECHNICIAN",
  "SERVICE_CENTER",
] as const;

/** Fuente única de verdad — mantener en sync con docs/permissions-matrix.md */
export const PERMISSION_MATRIX: PermissionMatrix = {
  dashboard: {
    read: ALL_ROLES,
  },
  companies: {
    read: ADMIN_DIST,
    create: ADMIN_DIST,
    update: ADMIN_DIST,
    delete: ADMIN_ONLY,
  },
  branches: {
    read: ALL_ROLES,
    create: ADMIN_DIST,
    update: ADMIN_DIST,
    delete: ADMIN_ONLY,
  },
  employees: {
    read: ALL_ROLES,
    create: ADMIN_DIST,
    update: ADMIN_ONLY,
    delete: ADMIN_ONLY,
    assignRoles: ["ADMIN", "DISTRIBUTOR", "TECHNICIAN", "SERVICE_CENTER"],
  },
  printers: {
    read: ADMIN_DIST_TECH,
    create: ADMIN_ONLY,
    update: ADMIN_ONLY,
    delete: ADMIN_ONLY,
  },
  printerModels: {
    read: ADMIN_DIST_TECH,
    create: ADMIN_ONLY,
    update: ADMIN_ONLY,
    delete: ADMIN_ONLY,
  },
  seals: {
    read: FIELD_OPS,
    create: FIELD_OPS,
    update: FIELD_OPS,
    delete: FIELD_OPS,
  },
  technicalServices: {
    read: FIELD_OPS,
    create: FIELD_OPS,
    update: FIELD_OPS,
    delete: FIELD_OPS,
  },
  annualInspections: {
    read: FIELD_OPS_DIST,
    create: FIELD_OPS_DIST,
    update: FIELD_OPS_DIST,
    delete: FIELD_OPS_DIST,
  },
  contracts: {
    read: ADMIN_ONLY,
    create: ADMIN_ONLY,
    update: ADMIN_ONLY,
    delete: ADMIN_ONLY,
  },
  users: {
    read: ADMIN_ONLY,
    create: ADMIN_ONLY,
    update: ADMIN_ONLY,
    delete: ADMIN_ONLY,
  },
  mqtt: {
    read: ADMIN_ONLY,
    create: ADMIN_ONLY,
  },
  seniatExtract: {
    read: ADMIN_DIST,
    create: ADMIN_DIST,
  },
  uploads: {
    read: [...ADMIN_DIST_TECH, "SERVICE_CENTER"],
    create: [...ADMIN_DIST_TECH, "SERVICE_CENTER"],
  },
};

/** Roles permitidos para recurso × acción; vacío si la acción no aplica al recurso. */
export function allowedRolesFor(
  resource: Resource,
  action: Action,
): readonly Role[] {
  return PERMISSION_MATRIX[resource]?.[action] ?? [];
}

export function isPermissionDefined(
  resource: Resource,
  action: Action,
): boolean {
  return PERMISSION_MATRIX[resource]?.[action] != null;
}
