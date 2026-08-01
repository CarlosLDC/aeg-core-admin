import type { Action, PermissionMatrix, Resource } from "@/lib/permissions/types";
import { ROLES, type Role } from "@/types/user";

const ADMIN_ONLY = ["ADMIN"] as const;
const DISTRIBUTOR_PANEL = ["ADMIN", "DISTRIBUTOR"] as const;
const SEAL_WRITE = ["ADMIN", "DISTRIBUTOR"] as const;
const ANNUAL_INSPECTION_WRITE = [
  "ADMIN",
  "DISTRIBUTOR",
  "TECHNICIAN",
  "SERVICE_CENTER",
] as const;
const TECHNICAL_SERVICE_WRITE = ["ADMIN", "TECHNICIAN", "SERVICE_CENTER"] as const;

/** Fuente única de verdad — mantener en sync con docs/permissions-matrix.md */
export const PERMISSION_MATRIX: PermissionMatrix = {
  dashboard: {
    read: DISTRIBUTOR_PANEL,
  },
  companies: {
    read: DISTRIBUTOR_PANEL,
    create: DISTRIBUTOR_PANEL,
    update: DISTRIBUTOR_PANEL,
    delete: ADMIN_ONLY,
  },
  branches: {
    read: DISTRIBUTOR_PANEL,
    create: DISTRIBUTOR_PANEL,
    update: DISTRIBUTOR_PANEL,
    delete: ADMIN_ONLY,
  },
  printers: {
    read: DISTRIBUTOR_PANEL,
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
  firmwares: {
    read: ADMIN_ONLY,
    create: ADMIN_ONLY,
    update: ADMIN_ONLY,
    delete: ADMIN_ONLY,
  },
  seals: {
    read: SEAL_WRITE,
    create: SEAL_WRITE,
    update: SEAL_WRITE,
    delete: SEAL_WRITE,
  },
  technicalServices: {
    read: ADMIN_ONLY,
    create: TECHNICAL_SERVICE_WRITE,
    update: TECHNICAL_SERVICE_WRITE,
    delete: TECHNICAL_SERVICE_WRITE,
  },
  annualInspections: {
    read: ADMIN_ONLY,
    create: ANNUAL_INSPECTION_WRITE,
    update: ANNUAL_INSPECTION_WRITE,
    delete: ANNUAL_INSPECTION_WRITE,
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
  clientTransfers: {
    read: ADMIN_ONLY,
    update: ADMIN_ONLY,
  },
  tools: {
    read: ROLES,
  },
  remoto: {
    read: ADMIN_ONLY,
    create: ADMIN_ONLY,
  },
  seniatExtract: {
    read: DISTRIBUTOR_PANEL,
    create: DISTRIBUTOR_PANEL,
  },
  uploads: {
    read: DISTRIBUTOR_PANEL,
    create: DISTRIBUTOR_PANEL,
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
