import type { ClientEditValues } from "@/components/clients/client-edit-dialog";
import type { ClientOnboardingValues } from "@/lib/client-onboarding";
import type { ClientModificationProposedData } from "@/types/client-modification-request";

export function toClientModificationProposedData(
  values: ClientEditValues,
  distributorId?: number | null,
): ClientModificationProposedData {
  return {
    businessName: values.businessName.trim(),
    rif: values.rif.trim().toUpperCase(),
    contributorType: values.contributorType,
    city: values.city.trim(),
    state: values.state.trim(),
    address: values.address.trim() || null,
    contactPersonName: values.contactPersonName.trim() || null,
    phone: values.phone.trim() || null,
    email: values.email.trim() || null,
    distributorId: distributorId ?? null,
  };
}

export function toClientModificationProposedDataFromOnboarding(
  values: ClientOnboardingValues,
  distributorId: number,
): ClientModificationProposedData {
  return toClientModificationProposedData(
    {
      businessName: values.businessName,
      rif: values.rif,
      contributorType: values.contributorType,
      city: values.city,
      state: values.state,
      address: values.address,
      contactPersonName: values.contactPersonName,
      phone: values.phone,
      email: values.email,
    },
    distributorId,
  );
}
