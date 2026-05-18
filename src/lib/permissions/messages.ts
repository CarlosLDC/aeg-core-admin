import type { Action, Resource } from "@/lib/permissions/types";

const RESOURCE_LABELS: Record<Resource, string> = {
  dashboard: "el panel",
  companies: "empresas",
  branches: "sucursales",
  employees: "empleados",
  printers: "impresoras",
  printerModels: "modelos fiscales",
  seals: "precintos",
  technicalServices: "servicios técnicos",
  annualInspections: "inspecciones anuales",
  contracts: "contratos",
  users: "usuarios",
  mqtt: "pruebas MQTT",
  seniatExtract: "extracción SENIAT",
  uploads: "documentos adjuntos",
};

const ACTION_LABELS: Record<Action, string> = {
  read: "ver",
  create: "crear",
  update: "modificar",
  delete: "eliminar",
  assignRoles: "asignar roles operativos en",
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
