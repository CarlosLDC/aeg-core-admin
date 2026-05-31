import { branchWizardNeedsContracts } from "@/lib/branch-wizard-contracts";
import type { BranchWithRoles } from "@/types/branch";
import type {
  DistributorContractResponse,
  ServiceCenterContractResponse,
} from "@/types/contract";

export type ContractPartyCoverage = {
  distributorIds: Set<number>;
  serviceCenterIds: Set<number>;
};

export type MissingContractKind = "distributor" | "serviceCenter";

const MISSING_CONTRACT_LABELS: Record<MissingContractKind, string> = {
  distributor: "distribuidora",
  serviceCenter: "centro de servicio",
};

export function buildContractPartyCoverage(
  distributorContracts: DistributorContractResponse[],
  serviceCenterContracts: ServiceCenterContractResponse[],
): ContractPartyCoverage {
  return {
    distributorIds: new Set(
      distributorContracts.map((contract) => contract.distributorId),
    ),
    serviceCenterIds: new Set(
      serviceCenterContracts.map((contract) => contract.serviceCenterId),
    ),
  };
}

export function getBranchMissingContractKinds(
  branch: BranchWithRoles,
  coverage: ContractPartyCoverage,
): MissingContractKind[] {
  if (
    !branchWizardNeedsContracts({
      isDistributor: Boolean(branch.distributor),
      isServiceCenter: Boolean(branch.serviceCenter),
    })
  ) {
    return [];
  }

  const missing: MissingContractKind[] = [];
  if (
    branch.distributor &&
    !coverage.distributorIds.has(branch.distributor.id)
  ) {
    missing.push("distributor");
  }
  if (
    branch.serviceCenter &&
    !coverage.serviceCenterIds.has(branch.serviceCenter.id)
  ) {
    missing.push("serviceCenter");
  }
  return missing;
}

export function missingContractLabels(
  kinds: MissingContractKind[],
): string[] {
  return kinds.map((kind) => MISSING_CONTRACT_LABELS[kind]);
}

export function branchMissingContractMessage(labels: string[]): string | null {
  if (labels.length === 0) return null;
  if (labels.length === 1) {
    return `Falta contrato de ${labels[0]}.`;
  }
  return `Faltan contratos de ${labels.join(" y ")}.`;
}
