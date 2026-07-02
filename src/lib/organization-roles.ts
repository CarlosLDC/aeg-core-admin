export const ORGANIZATION_TYPES = ["STANDARD", "FACTORY"] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const BRANCH_ORGANIZATION_ROLES = [
  "NONE",
  "DISTRIBUTOR",
  "SERVICE_CENTER",
] as const;
export type BranchOrganizationRole = (typeof BRANCH_ORGANIZATION_ROLES)[number];

export const BRANCH_OPERATIONAL_ROLE_OPTIONS: {
  value: BranchOrganizationRole;
  label: string;
}[] = [
  { value: "NONE", label: "Ninguno" },
  { value: "DISTRIBUTOR", label: "Distribuidora" },
  { value: "SERVICE_CENTER", label: "Centro de servicio" },
];

export function isFactoryCompany(
  organizationType?: OrganizationType | null,
): boolean {
  return organizationType === "FACTORY";
}

export function findFactoryCompany<T extends { organizationType?: OrganizationType | null }>(
  companies: T[],
): T | null {
  return companies.find((c) => isFactoryCompany(c.organizationType)) ?? null;
}

export function factoryCompanyDisplayLabel(company: {
  businessName: string;
  rif: string;
}): string {
  return `${company.businessName} — RIF ${company.rif}`;
}

export function organizationRoleFromBranch(branch: {
  organizationRole?: BranchOrganizationRole;
  distributor?: unknown;
  serviceCenter?: unknown;
}): BranchOrganizationRole {
  if (branch.organizationRole) return branch.organizationRole;
  if (branch.distributor) return "DISTRIBUTOR";
  if (branch.serviceCenter) return "SERVICE_CENTER";
  return "NONE";
}

export function validateBranchRoleSelection(
  organizationRole: BranchOrganizationRole,
  isClient: boolean,
  isFactoryCompanyFlag: boolean,
): string | null {
  if (isFactoryCompanyFlag && organizationRole !== "NONE") {
    return "Las sucursales de la empresa fábrica no pueden ser distribuidora ni centro de servicio.";
  }
  if (organizationRole === "NONE" && !isClient) {
    return null;
  }
  return null;
}
