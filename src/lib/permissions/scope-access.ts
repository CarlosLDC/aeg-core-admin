import type { CompanyScope } from "@/lib/company-scope";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import {
  filterAnnualInspectionsInScope,
  filterSealsByPrinterScope,
  filterTechnicalServicesInScope,
} from "@/lib/scope-filters";
import type { PrinterResponse } from "@/types/printer";
import type { SealResponse } from "@/types/seal";
import { isDistributorPanelRole, type Role } from "@/types/user";

export function isCompanyInScope(
  scope: CompanyScope | null,
  companyId: number,
  role: Role,
): boolean {
  if (role === "ADMIN") return true;
  return scope?.companyIds.has(companyId) ?? false;
}

export function isBranchInScope(
  scope: CompanyScope | null,
  branchId: number,
  role: Role,
): boolean {
  if (role === "ADMIN") return true;
  if (!scope) return false;
  return scope.branches.some((b) => b.id === branchId);
}

export function assertCompanyInScope(
  scope: CompanyScope | null,
  company: CompanyResponse | null | undefined,
  role: Role,
): boolean {
  if (!company) return false;
  return isCompanyInScope(scope, company.id, role);
}

export function assertBranchInScope(
  scope: CompanyScope | null,
  branch: BranchResponse | null | undefined,
  role: Role,
): boolean {
  if (!branch) return false;
  return isBranchInScope(scope, branch.id, role);
}

export function assertPrinterInScope(
  scope: CompanyScope | null,
  printer: PrinterResponse | null | undefined,
  role: Role,
  distributorId: number | null,
): boolean {
  if (!printer) return false;
  if (role === "ADMIN") return true;
  if (isDistributorPanelRole(role) && distributorId != null) {
    return printer.distributorId === distributorId;
  }
  if (!scope) return false;
  return true;
}

export function assertSealInScope(
  seal: SealResponse | null | undefined,
  scopedPrinterIds: Set<number>,
  role: Role,
): boolean {
  if (!seal) return false;
  return filterSealsByPrinterScope([seal], scopedPrinterIds, role).length > 0;
}

export function assertTechnicalServiceInScope<
  T extends { printerId: number; distributorId: number | null },
>(
  row: T | null | undefined,
  printerIds: Set<number>,
  role: Role,
  distributorId: number | null,
): boolean {
  if (!row) return false;
  return (
    filterTechnicalServicesInScope([row], printerIds, role, distributorId)
      .length > 0
  );
}

export function assertAnnualInspectionInScope<
  T extends { printerId: number; userId: number },
>(
  row: T | null | undefined,
  printerIds: Set<number>,
  technicianUserIds: Set<number>,
  role: Role,
): boolean {
  if (!row) return false;
  return (
    filterAnnualInspectionsInScope(
      [row],
      printerIds,
      technicianUserIds,
      role,
    ).length > 0
  );
}
