"use client";

import { DistributorSelect } from "@/components/branches/distributor-select";
import { FieldLabel } from "@/components/ui/field-label";
import type { BranchWizardValues } from "@/components/branches/branch-wizard-types";
import { BranchOperationalRoleFields } from "@/components/branches/branch-operational-role-fields";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";

type BranchWizardRolesFieldsProps = {
  form: BranchWizardValues;
  setForm: React.Dispatch<React.SetStateAction<BranchWizardValues>>;
  saving: boolean;
  branches: BranchResponse[];
  distributors: DistributorResponse[];
  companies: CompanyResponse[];
  companyOrganizationType?: CompanyResponse["organizationType"];
};

export function BranchWizardRolesFields({
  form,
  setForm,
  saving,
  branches,
  distributors,
  companies,
  companyOrganizationType,
}: BranchWizardRolesFieldsProps) {
  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Roles de empresa</legend>
      <BranchOperationalRoleFields
        values={{
          organizationRole: form.organizationRole,
          isClient: form.isClient,
          clientDistributorId: form.clientDistributorId,
          canWriteAnnualInspection: form.canWriteAnnualInspection,
        }}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        disabled={saving}
        branches={branches}
        distributors={distributors}
        companies={companies}
        companyOrganizationType={companyOrganizationType}
      />
    </fieldset>
  );
}
