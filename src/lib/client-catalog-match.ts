import type { ClientOnboardingValues } from "@/lib/client-onboarding";
import { statesMatch } from "@/lib/state-label";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";

function norm(value?: string | null): string {
  return (value ?? "").trim();
}

/** Compara datos del formulario de alta con empresa/sucursal ya existentes en catálogo. */
export function onboardingMatchesCatalog(
  company: CompanyResponse | undefined,
  branch: BranchResponse,
  values: ClientOnboardingValues,
): boolean {
  if (!company) return false;
  return (
    norm(company.rif).toUpperCase() === values.rif.trim().toUpperCase() &&
    norm(company.businessName) === values.businessName.trim() &&
    company.contributorType === values.contributorType &&
    norm(branch.city) === values.city.trim() &&
    statesMatch(branch.state, values.state) &&
    norm(branch.address) === values.address.trim() &&
    norm(branch.contactPersonName) === values.contactPersonName.trim() &&
    norm(branch.phone) === values.phone.trim() &&
    norm(branch.email) === values.email.trim()
  );
}
