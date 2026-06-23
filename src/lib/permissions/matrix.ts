import type { Action, PermissionMatrix, Resource } from "@/lib/permissions/types";
import type { Role } from "@/types/user";

const ADMIN_ONLY = ["ADMIN"] as const;
const ADMIN_TECH = ["ADMIN", "TECHNICIAN"] as const;
const FIELD_OPS = ["ADMIN", "TECHNICIAN"] as const;
const ALL_PANEL_ROLES = ["ADMIN", "TECHNICIAN"] as const;

/** Fuente única de verdad — mantener en sync con docs/permissions-matrix.md */
export const PERMISSION_MATRIX: PermissionMatrix = {
  dashboard: {
    read: ALL_PANEL_ROLES,
  },
  companies: {
    read: ADMIN_TECH,
    create: ADMIN_TECH,
    update: ADMIN_TECH,
    delete: ADMIN_ONLY,
  },
  branches: {
    read: ALL_PANEL_ROLES,
    create: ADMIN_TECH,
    update: ADMIN_TECH,
    delete: ADMIN_ONLY,
  },
  printers: {
    read: ADMIN_TECH,
    create: ADMIN_ONLY,
    update: ADMIN_ONLY,
    delete: ADMIN_ONLY,
  },
  printerModels: {
    read: ADMIN_ONLY,
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
    read: FIELD_OPS,
    create: FIELD_OPS,
    update: FIELD_OPS,
    delete: FIELD_OPS,
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
    read: ADMIN_TECH,
    create: ADMIN_TECH,
  },
  uploads: {
    read: ADMIN_TECH,
    create: ADMIN_TECH,
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
