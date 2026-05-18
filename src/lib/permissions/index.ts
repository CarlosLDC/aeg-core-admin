export { can } from "@/lib/permissions/can";
export { PERMISSION_MATRIX } from "@/lib/permissions/matrix";
export {
  CATALOG_CREATE_FORBIDDEN_MESSAGE,
  CATALOG_DELETE_FORBIDDEN_MESSAGE,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
  CATALOG_UPDATE_FORBIDDEN_MESSAGE,
  forbiddenMessage,
  getCatalogForbiddenMessage,
} from "@/lib/permissions/messages";
export {
  allowedRolesForPath,
  canAccessRoute,
  isKnownAppPath,
  resourceForPath,
} from "@/lib/permissions/routes";
export type { Action, Resource } from "@/lib/permissions/types";
export { ACTIONS, RESOURCES } from "@/lib/permissions/types";
