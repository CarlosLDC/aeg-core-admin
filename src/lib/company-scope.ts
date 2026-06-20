import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { Role } from "@/types/user";

export type CompanyScopeInput = {
  role: Role;
  branchId: number | null;
  distributorId: number | null;
  companies: CompanyResponse[];
  branches: BranchResponse[];
};

export type CompanyScope = {
  role: Role;
  branchId: number | null;
  distributorId: number | null;
  companies: CompanyResponse[];
  branches: BranchResponse[];
  companyIds: Set<number>;
};

export function canBrowseOtherCompanies(role: Role): boolean {
  return role === "ADMIN" || role === "TECHNICIAN";
}

/** PUT/DELETE en empresas — solo ADMIN (POST permitido a cualquier autenticado). */
export { canModifyCatalogRecord as canManageCompanies } from "@/lib/api-permissions";

/**
 * ADMIN y DISTRIBUTOR: el backend filtra companies/branches en cada GET.
 * Otros roles: solo la empresa de su sucursal (por si el API no filtra).
 */
export function buildCompanyScope(input: CompanyScopeInput): CompanyScope {
  const { role, branchId, distributorId, companies, branches } = input;

  if (role === "ADMIN" || role === "TECHNICIAN") {
    const companyIds = new Set(companies.map((c) => c.id));
    return {
      role,
      branchId,
      distributorId,
      companies,
      branches,
      companyIds,
    };
  }

  if (branchId == null) {
    return {
      role,
      branchId,
      distributorId,
      companies: [],
      branches: [],
      companyIds: new Set(),
    };
  }

  const ownBranch = branches.find((b) => b.id === branchId);
  if (!ownBranch) {
    return {
      role,
      branchId,
      distributorId,
      companies: [],
      branches: [],
      companyIds: new Set(),
    };
  }

  const scopedCompanies = companies.filter((c) => c.id === ownBranch.companyId);
  const companyIds = new Set(scopedCompanies.map((c) => c.id));
  const scopedBranches = branches.filter((b) => companyIds.has(b.companyId));

  return {
    role,
    branchId,
    distributorId,
    companies: scopedCompanies,
    branches: scopedBranches,
    companyIds,
  };
}
