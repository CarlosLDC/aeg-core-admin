import {
  emptyBranchWizardContractDraft,
  type BranchWizardValues,
} from "@/components/branches/branch-wizard-types";
import type { BranchFormValues } from "@/components/branches/branch-form-dialog";
import type { BranchRoleFormState } from "@/lib/branch-roles";
import { organizationRoleFromBranch } from "@/lib/organization-roles";
import type { BranchWithRoles } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";

export function toBranchRoleFormState(values: BranchFormValues): BranchRoleFormState {
  return {
    organizationRole: values.organizationRole,
    isClient: values.isClient,
    clientDistributorId: values.clientDistributorId,
  };
}

export function toBranchFormValues(values: BranchWizardValues): BranchFormValues {
  return {
    companyId: values.linkedCompanyId != null ? String(values.linkedCompanyId) : "",
    city: values.city,
    state: values.state,
    address: values.address,
    contactPersonName: values.contactPersonName,
    phone: values.phone,
    email: values.email,
    organizationRole: values.organizationRole,
    isClient: values.isClient,
    clientDistributorId: values.clientDistributorId,
  };
}

export function branchToWizardValues(
  branch: BranchWithRoles,
  companies: CompanyResponse[],
): BranchWizardValues {
  const company = companies.find((row) => row.id === branch.companyId);
  return {
    rif: company?.rif ?? "",
    businessName: company?.businessName ?? "",
    contributorType: company?.contributorType ?? "ordinario",
    linkedCompanyId: branch.companyId,
    city: branch.city,
    state: branch.state,
    address: branch.address ?? "",
    contactPersonName: branch.contactPersonName ?? "",
    phone: branch.phone ?? "",
    email: branch.email ?? "",
    organizationRole: organizationRoleFromBranch(branch),
    isClient: Boolean(branch.client),
    clientDistributorId: branch.client?.distributorId
      ? String(branch.client.distributorId)
      : "",
    distributorContract: emptyBranchWizardContractDraft(),
    serviceCenterContract: emptyBranchWizardContractDraft(),
  };
}
