import { RIF_PATTERN } from "@/lib/seniat-extract";

export type OnboardingStepSection =
  | "scan"
  | "fiscal"
  | "location"
  | "contact"
  | "headquarters"
  | "roles";

export type DistributorOnboardingForm = {
  rif: string;
  businessName: string;
  linkedCompanyId: number | null;
  city: string;
  state: string;
  contactPersonName: string;
  headquartersMode?: "new" | "existing";
  headquartersBranchId?: number | null;
};

export function validateOnboardingSection(
  section: OnboardingStepSection,
  form: DistributorOnboardingForm,
): string | null {
  if (section === "fiscal") {
    const companyLocked = Boolean(form.linkedCompanyId);
    const rif = form.rif.trim().toUpperCase();
    if (!companyLocked && !RIF_PATTERN.test(rif)) {
      return "Formato: letra V, E, J, P o G seguida de 7 a 9 dígitos.";
    }
    if (!companyLocked && !form.businessName.trim()) {
      return "Indica la razón social de la empresa.";
    }
    return null;
  }

  if (section === "location") {
    if (!form.state.trim() || !form.city.trim()) {
      return "Estado y ciudad son obligatorios.";
    }
    return null;
  }

  if (section === "contact") {
    return null;
  }

  if (section === "headquarters") {
    if (form.headquartersMode === "existing" && !form.headquartersBranchId) {
      return "Selecciona una sucursal existente para casa matriz.";
    }
    return null;
  }

  return null;
}
