import { can } from "@/lib/permissions/can";
import {
  CATALOG_CREATE_FORBIDDEN_MESSAGE,
  CATALOG_DELETE_FORBIDDEN_MESSAGE,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
  CATALOG_UPDATE_FORBIDDEN_MESSAGE,
  getCatalogForbiddenMessage,
} from "@/lib/permissions/messages";
import type { Role } from "@/types/user";

export {
  CATALOG_CREATE_FORBIDDEN_MESSAGE,
  CATALOG_DELETE_FORBIDDEN_MESSAGE,
  CATALOG_MODIFY_FORBIDDEN_MESSAGE,
  CATALOG_UPDATE_FORBIDDEN_MESSAGE,
  getCatalogForbiddenMessage,
};

/** POST empresas, sucursales, empleados (catálogo base). */
export function canCreateCatalogRecord(role: Role): boolean {
  return can(role, "companies", "create");
}

/** POST sucursales (misma regla que empresas para distribuidor). */
export function canCreateBranchRecord(role: Role): boolean {
  return can(role, "branches", "create");
}

/** POST empleados. */
export function canCreateEmployeeRecord(role: Role): boolean {
  return can(role, "employees", "create");
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

export function canUpdateCompanyRecord(role: Role): boolean {
  return can(role, "companies", "update");
}

export function canUpdateBranchRecord(role: Role): boolean {
  return can(role, "branches", "update");
}

export function canUpdateEmployeeRecord(role: Role): boolean {
  return can(role, "employees", "update");
}

/** PUT catálogo (compat: todas las entidades de catálogo). */
export function canUpdateCatalogRecord(role: Role): boolean {
  return (
    canUpdateCompanyRecord(role) &&
    canUpdateBranchRecord(role) &&
    canUpdateEmployeeRecord(role)
  );
}

export function canDeleteCompanyRecord(role: Role): boolean {
  return can(role, "companies", "delete");
}

export function canDeleteBranchRecord(role: Role): boolean {
  return can(role, "branches", "delete");
}

export function canDeleteEmployeeRecord(role: Role): boolean {
  return can(role, "employees", "delete");
}

/** DELETE catálogo (compat). */
export function canDeleteCatalogRecord(role: Role): boolean {
  return (
    canDeleteCompanyRecord(role) &&
    canDeleteBranchRecord(role) &&
    canDeleteEmployeeRecord(role)
  );
}

/** Alias: modificar empresas/sucursales/empleados (PUT). */
export function canModifyCatalogRecord(role: Role): boolean {
  return canUpdateCatalogRecord(role);
}

export function canAssignEmployeeRoles(role: Role): boolean {
  return can(role, "employees", "assignRoles");
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

export function canUseSeniatExtract(role: Role): boolean {
  return can(role, "seniatExtract", "create");
}

export function canAccessUploads(role: Role): boolean {
  return can(role, "uploads", "read");
}
