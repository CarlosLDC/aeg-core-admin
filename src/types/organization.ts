export const ORGANIZATION_TYPES = ["STANDARD", "FACTORY"] as const;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const BRANCH_ORGANIZATION_ROLES = [
  "NONE",
  "DISTRIBUTOR",
  "SERVICE_CENTER",
] as const;
export type BranchOrganizationRole = (typeof BRANCH_ORGANIZATION_ROLES)[number];
