import type {
  BranchWizardContractDraft,
  BranchWizardValues,
} from "@/components/branches/branch-wizard-types";
import type { ClientOnboardingRoleOptions } from "@/lib/client-onboarding";
import {
  toDistributorContractBody,
  toServiceCenterContractBody,
  validateContractForm,
  type ContractFormValues,
} from "@/lib/contract-form";
import { createDistributorContract } from "@/lib/distributor-contracts-api";
import { createServiceCenterContract } from "@/lib/service-center-contracts-api";

export function branchWizardNeedsContracts(
  roles: Pick<
    ClientOnboardingRoleOptions,
    "isDistributor" | "isServiceCenter"
  >,
): boolean {
  return roles.isDistributor || roles.isServiceCenter;
}

function draftToFormValues(
  draft: BranchWizardContractDraft,
  partyId: number,
): ContractFormValues {
  return {
    partyId: String(partyId),
    startDate: draft.startDate,
    endDate: draft.endDate,
    photoUrls: draft.photoUrls,
  };
}

function validateWizardDraft(
  draft: BranchWizardContractDraft,
  kind: "distributor" | "serviceCenter",
): string | null {
  return validateContractForm(draftToFormValues(draft, 1), kind);
}

function validateDraftWithPartyId(
  draft: BranchWizardContractDraft,
  partyId: number | null | undefined,
  kind: "distributor" | "serviceCenter",
): string | null {
  if (partyId == null || partyId <= 0) {
    return kind === "distributor"
      ? "No se creó el registro de distribuidora."
      : "No se creó el registro de centro de servicio.";
  }
  return validateContractForm(draftToFormValues(draft, partyId), kind);
}

export function validateBranchWizardContracts(
  values: BranchWizardValues,
  roles: Pick<
    ClientOnboardingRoleOptions,
    "isDistributor" | "isServiceCenter"
  >,
): string | null {
  if (roles.isDistributor) {
    const formErr = validateWizardDraft(
      values.distributorContract,
      "distributor",
    );
    if (formErr) return `Contrato de distribuidora: ${formErr}`;
  }

  if (roles.isServiceCenter) {
    const formErr = validateWizardDraft(
      values.serviceCenterContract,
      "serviceCenter",
    );
    if (formErr) return `Contrato de centro de servicio: ${formErr}`;
  }

  return null;
}

export type CreateBranchWizardContractsInput = {
  values: BranchWizardValues;
  roles: Pick<
    ClientOnboardingRoleOptions,
    "isDistributor" | "isServiceCenter"
  >;
  distributorId?: number | null;
  serviceCenterId?: number | null;
};

export type CreateBranchWizardContractsResult = {
  distributorContractId?: number;
  serviceCenterContractId?: number;
};

export async function createBranchWizardContracts(
  input: CreateBranchWizardContractsInput,
): Promise<CreateBranchWizardContractsResult> {
  const { values, roles, distributorId, serviceCenterId } = input;
  const result: CreateBranchWizardContractsResult = {};

  if (roles.isDistributor) {
    const validationError = validateDraftWithPartyId(
      values.distributorContract,
      distributorId,
      "distributor",
    );
    if (validationError) {
      throw new Error(validationError);
    }
    const body = toDistributorContractBody(
      draftToFormValues(values.distributorContract, distributorId!),
    );
    if (typeof body === "string") {
      throw new Error(body);
    }
    const created = await createDistributorContract(body);
    result.distributorContractId = created.id;
  }

  if (roles.isServiceCenter) {
    const validationError = validateDraftWithPartyId(
      values.serviceCenterContract,
      serviceCenterId,
      "serviceCenter",
    );
    if (validationError) {
      throw new Error(validationError);
    }
    const body = toServiceCenterContractBody(
      draftToFormValues(values.serviceCenterContract, serviceCenterId!),
    );
    if (typeof body === "string") {
      throw new Error(body);
    }
    const created = await createServiceCenterContract(body);
    result.serviceCenterContractId = created.id;
  }

  return result;
}
