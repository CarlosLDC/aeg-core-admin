/** Valores JSON/BD (@JsonValue en ContributorType.java) */
export const CONTRIBUTOR_TYPES = ["ordinario", "especial", "formal"] as const;

export type ContributorType = (typeof CONTRIBUTOR_TYPES)[number];

export type CompanyResponse = {
  id: number;
  businessName: string;
  createdAt: string;
  rif: string;
  contributorType: ContributorType;
};

export type CompanyRequest = {
  businessName: string;
  rif: string;
  contributorType: ContributorType;
};
