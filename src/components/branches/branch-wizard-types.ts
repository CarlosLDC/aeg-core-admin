import type { ContributorType } from "@/types/company";

export type BranchWizardValues = {
  rif: string;
  businessName: string;
  contributorType: ContributorType;
  linkedCompanyId: number | null;
  city: string;
  state: string;
  address: string;
  contactPersonName: string;
  phone: string;
  email: string;
  isClient: boolean;
  isDistributor: boolean;
  isServiceCenter: boolean;
  clientDistributorId: string;
};

export const emptyBranchWizardForm = (): BranchWizardValues => ({
  rif: "",
  businessName: "",
  contributorType: "ordinario",
  linkedCompanyId: null,
  city: "",
  state: "",
  address: "",
  contactPersonName: "",
  phone: "",
  email: "",
  isClient: false,
  isDistributor: false,
  isServiceCenter: false,
  clientDistributorId: "",
});
