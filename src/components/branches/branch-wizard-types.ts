import type { ContributorType } from "@/types/company";
import type { BranchOrganizationRole } from "@/types/organization";

export type BranchWizardContractDraft = {
  startDate: string;
  endDate: string;
  photoUrls: string[];
};

export const emptyBranchWizardContractDraft = (): BranchWizardContractDraft => ({
  startDate: "",
  endDate: "",
  photoUrls: [],
});

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
  organizationRole: BranchOrganizationRole;
  isClient: boolean;
  clientDistributorId: string;
  distributorContract: BranchWizardContractDraft;
  serviceCenterContract: BranchWizardContractDraft;
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
  organizationRole: "NONE",
  isClient: false,
  clientDistributorId: "",
  distributorContract: emptyBranchWizardContractDraft(),
  serviceCenterContract: emptyBranchWizardContractDraft(),
});
