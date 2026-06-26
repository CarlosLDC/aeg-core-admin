import { CONTRIBUTOR_TYPES, type ContributorType } from "@/types/company";
import { RIF_PATTERN } from "@/lib/seniat-extract";

export type OnboardingStepSection =
  | "scan"
  | "fiscal"
  | "location"
  | "contact"
  | "roles";

export type DistributorOnboardingForm = {
  rif: string;
  businessName: string;
  linkedCompanyId: number | null;
  contributorType: ContributorType;
  city: string;
  state: string;
  address: string;
  contactPersonName: string;
};

export type OnboardingValidationOptions = {
  requireContributorType?: boolean;
  requireAddress?: boolean;
};

export function validateOnboardingSection(
  section: OnboardingStepSection,
  form: DistributorOnboardingForm,
  options: OnboardingValidationOptions = {},
): string | null {
  const requireContributorType = options.requireContributorType ?? true;
  const requireAddress = options.requireAddress ?? true;

  if (section === "fiscal") {
    const companyLocked = Boolean(form.linkedCompanyId);
    const rif = form.rif.trim().toUpperCase();
    if (!companyLocked && !RIF_PATTERN.test(rif)) {
      return "Formato: letra V, E, J, P o G seguida de 7 a 9 dígitos.";
    }
    if (!companyLocked && !form.businessName.trim()) {
      return "Indica la razón social de la empresa.";
    }
    if (
      requireContributorType &&
      !companyLocked &&
      !CONTRIBUTOR_TYPES.includes(form.contributorType)
    ) {
      return "El tipo de contribuyente es obligatorio.";
    }
    return null;
  }

  if (section === "location") {
    if (!form.state.trim() || !form.city.trim()) {
      return "Estado y ciudad son obligatorios.";
    }
    if (requireAddress && !form.address.trim()) {
      return "La dirección es obligatoria.";
    }
    return null;
  }

  if (section === "contact") {
    return null;
  }

  return null;
}
