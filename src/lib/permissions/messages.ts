import type { Action, Resource } from "@/lib/permissions/types";
import type { Role } from "@/types/user";

export const RESOURCE_LABELS: Record<Resource, string> = {
  dashboard: "el panel",
  companies: "empresas",
  branches: "empresas",
  printers: "impresoras",
  printerModels: "modelos fiscales",
  firmwares: "versiones de firmware",
  seals: "precintos",
  technicalServices: "servicios técnicos",
  annualInspections: "inspecciones anuales",
  contracts: "contratos",
  users: "usuarios",
  clientTransfers: "transferir cliente",
  tools: "AEG Tools",
  remoto: "pruebas Remoto",
  seniatExtract: "extracción SENIAT",
  uploads: "documentos adjuntos",
};

export const ACTION_LABELS: Record<Action, string> = {
  read: "ver",
  create: "crear",
  update: "modificar",
  delete: "eliminar",
  assignRoles: "asignar roles operativos en",
};

/** Encabezados cortos para la matriz de permisos */
export const ACTION_COLUMN_LABELS: Record<Action, string> = {
  read: "Leer",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
  assignRoles: "Asignar roles",
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  DISTRIBUTOR: "Distribuidor",
  TECHNICIAN: "Técnico",
  SERVICE_CENTER: "Centro de servicio",
  SENIAT: "Auditor SENIAT",
};

export const ROLE_ABBREV: Record<Role, string> = {
  ADMIN: "ADM",
  DISTRIBUTOR: "DIS",
  TECHNICIAN: "TEC",
  SERVICE_CENTER: "CS",
  SENIAT: "SEN",
};

export function forbiddenMessage(
  action: Action,
  resource: Resource,
): string {
  const resourceLabel = RESOURCE_LABELS[resource];
  const actionLabel = ACTION_LABELS[action];

  if (action === "read") {
    return `No tienes permiso para acceder a ${resourceLabel}.`;
  }
  if (action === "create") {
    return `No tienes permiso para crear ${resourceLabel}.`;
  }
  if (action === "delete") {
    return `No tienes permiso para eliminar ${resourceLabel}.`;
  }
  if (action === "assignRoles") {
    return `No tienes permiso para ${actionLabel} ${resourceLabel}.`;
  }
  return `No tienes permiso para ${actionLabel} ${resourceLabel}.`;
}

/** Compatibilidad con mensajes anteriores del catálogo. */
export const CATALOG_CREATE_FORBIDDEN_MESSAGE = forbiddenMessage(
  "create",
  "companies",
);

export const CATALOG_UPDATE_FORBIDDEN_MESSAGE = forbiddenMessage(
  "update",
  "companies",
);

export const CATALOG_DELETE_FORBIDDEN_MESSAGE = forbiddenMessage(
  "delete",
  "companies",
);

export const CATALOG_MODIFY_FORBIDDEN_MESSAGE = forbiddenMessage(
  "update",
  "companies",
);

export function getCatalogForbiddenMessage(
  method: "PUT" | "DELETE" | "MODIFY",
): string {
  if (method === "PUT") return CATALOG_UPDATE_FORBIDDEN_MESSAGE;
  if (method === "DELETE") return CATALOG_DELETE_FORBIDDEN_MESSAGE;
  return CATALOG_MODIFY_FORBIDDEN_MESSAGE;
}
