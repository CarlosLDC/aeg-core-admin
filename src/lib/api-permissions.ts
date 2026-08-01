import { can } from "@/lib/permissions/can";
import {
  CATALOG_CREATE_FORBIDDEN_MESSAGE,
  CATALOG_DELETE_FORBIDDEN_MESSAGE,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
  CATALOG_UPDATE_FORBIDDEN_MESSAGE,
  getCatalogForbiddenMessage,
} from "@/lib/permissions/messages";
import { isDistributorPanelRole, type Role } from "@/types/user";

export {
  CATALOG_CREATE_FORBIDDEN_MESSAGE,
  CATALOG_DELETE_FORBIDDEN_MESSAGE,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
  CATALOG_UPDATE_FORBIDDEN_MESSAGE,
  getCatalogForbiddenMessage,
};

export { isDistributorPanelRole };

/** POST empresas y sucursales (catálogo base). */
export function canCreateCatalogRecord(role: Role): boolean {
  return can(role, "companies", "create");
}

/** POST sucursales (misma regla que empresas para técnicos). */
export function canCreateBranchRecord(role: Role): boolean {
  return can(role, "branches", "create");
}

/** POST impresoras. */
export function canCreatePrinterRecord(role: Role): boolean {
  return can(role, "printers", "create");
}

/** PUT/DELETE impresoras. */
export function canModifyPrinterRecord(role: Role): boolean {
  return can(role, "printers", "update");
}

export function canDeletePrinterRecord(role: Role): boolean {
  return can(role, "printers", "delete");
}

/** Enajenar impresoras asignadas: admin global, distribuidor/técnico dentro de su alcance. */
export function canDisposePrinterRecord(role: Role): boolean {
  return role === "ADMIN" || isDistributorPanelRole(role);
}

/** Retirar una solicitud de revisión propia (clientes). */
export function canCancelModificationReview(role: Role): boolean {
  return isDistributorPanelRole(role);
}

export function canUpdateCompanyRecord(role: Role): boolean {
  return can(role, "companies", "update");
}

export function canUpdateBranchRecord(role: Role): boolean {
  return can(role, "branches", "update");
}

/** PUT catálogo (compat: empresas y sucursales). */
export function canUpdateCatalogRecord(role: Role): boolean {
  return canUpdateCompanyRecord(role) && canUpdateBranchRecord(role);
}

export function canDeleteCompanyRecord(role: Role): boolean {
  return can(role, "companies", "delete");
}

export function canDeleteBranchRecord(role: Role): boolean {
  return can(role, "branches", "delete");
}

/** DELETE catálogo (compat). */
export function canDeleteCatalogRecord(role: Role): boolean {
  return canDeleteCompanyRecord(role) && canDeleteBranchRecord(role);
}

/** Alias: modificar empresas/sucursales (PUT). */
export function canModifyCatalogRecord(role: Role): boolean {
  return canUpdateCatalogRecord(role);
}

export function canCreateSealRecord(role: Role): boolean {
  return can(role, "seals", "create");
}

export function canModifySealRecord(role: Role): boolean {
  return can(role, "seals", "update");
}

export function canDeleteSealRecord(role: Role): boolean {
  return can(role, "seals", "delete");
}

export function canCreateTechnicalServiceRecord(role: Role): boolean {
  return can(role, "technicalServices", "create");
}

export function canModifyTechnicalServiceRecord(role: Role): boolean {
  return can(role, "technicalServices", "update");
}

export function canDeleteTechnicalServiceRecord(role: Role): boolean {
  return can(role, "technicalServices", "delete");
}

export function canCreateAnnualInspectionRecord(role: Role): boolean {
  return can(role, "annualInspections", "create");
}

export function canModifyAnnualInspectionRecord(role: Role): boolean {
  return can(role, "annualInspections", "update");
}

export function canDeleteAnnualInspectionRecord(role: Role): boolean {
  return can(role, "annualInspections", "delete");
}

export function canCreateContractRecord(role: Role): boolean {
  return can(role, "contracts", "create");
}

export function canManageContracts(role: Role): boolean {
  return can(role, "contracts", "update");
}

export function canDeleteContractRecord(role: Role): boolean {
  return can(role, "contracts", "delete");
}

export function canCreatePrinterModelRecord(role: Role): boolean {
  return can(role, "printerModels", "create");
}

export function canManagePrinterModels(role: Role): boolean {
  return can(role, "printerModels", "update");
}

export function canDeletePrinterModelRecord(role: Role): boolean {
  return can(role, "printerModels", "delete");
}

export function canCreateFirmwareRecord(role: Role): boolean {
  return can(role, "firmwares", "create");
}

export function canUpdateFirmwareRecord(role: Role): boolean {
  return can(role, "firmwares", "update");
}

export function canDeleteFirmwareRecord(role: Role): boolean {
  return can(role, "firmwares", "delete");
}

export function canUseSeniatExtract(role: Role): boolean {
  return can(role, "seniatExtract", "create");
}

export function canAccessUploads(role: Role): boolean {
  return can(role, "uploads", "read");
}
