import {
  branchPath,
  clientPath,
  employeePath,
  printerModelPath,
  printerPath,
  sealPath,
} from "@/lib/resource-routes";
import type { BranchWithRoles } from "@/types/branch";
import type {
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";

export function hrefForPrinterModel(modelId: number): string {
  return printerModelPath(modelId);
}

export function hrefForPrinter(
  printerId: number | null | undefined,
): string | undefined {
  return printerId != null ? printerPath(printerId) : undefined;
}

export function hrefForClient(
  clientId: number | null | undefined,
): string | undefined {
  return clientId != null ? clientPath(clientId) : undefined;
}

export function hrefForBranch(
  branchId: number | null | undefined,
): string | undefined {
  return branchId != null ? branchPath(branchId) : undefined;
}

export function hrefForEmployee(
  employeeId: number | null | undefined,
): string | undefined {
  return employeeId != null ? employeePath(employeeId) : undefined;
}

export function hrefForSeal(
  sealId: number | null | undefined,
): string | undefined {
  return sealId != null ? sealPath(sealId) : undefined;
}

export function hrefForDistributor(
  distributorId: number | null | undefined,
  distributors: DistributorResponse[],
): string | undefined {
  if (distributorId == null) return undefined;
  const distributor = distributors.find((d) => d.id === distributorId);
  return distributor ? branchPath(distributor.branchId) : undefined;
}

export function hrefForBranchClientDistributor(
  branch: BranchWithRoles,
  distributors: DistributorResponse[],
): string | undefined {
  return hrefForDistributor(branch.client?.distributorId, distributors);
}

export function hrefForServiceCenter(
  serviceCenterId: number,
  serviceCenters: ServiceCenterResponse[],
): string | undefined {
  const serviceCenter = serviceCenters.find((sc) => sc.id === serviceCenterId);
  return serviceCenter ? branchPath(serviceCenter.branchId) : undefined;
}
