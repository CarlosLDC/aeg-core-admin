import { canAccessRoute } from "@/lib/permissions/routes";
import {
  branchPath,
  clientPath,
  printerModelPath,
  printerPath,
  sealPath,
  userPath,
} from "@/lib/resource-routes";
import type { BranchWithRoles } from "@/types/branch";
import type {
  ClientResponse,
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";
import type { Role } from "@/types/user";

function hrefIfAccessible(
  role: Role,
  path: string | undefined,
): string | undefined {
  if (!path) return undefined;
  return canAccessRoute(role, path) ? path : undefined;
}

function hrefFirstAccessible(
  role: Role,
  paths: Array<string | undefined>,
): string | undefined {
  for (const path of paths) {
    const href = hrefIfAccessible(role, path);
    if (href) return href;
  }
  return undefined;
}

export function hrefForPrinterModel(modelId: number, role: Role): string | undefined {
  return hrefIfAccessible(role, printerModelPath(modelId));
}

export function hrefForPrinter(
  printerId: number | null | undefined,
  role: Role,
): string | undefined {
  return hrefIfAccessible(
    role,
    printerId != null ? printerPath(printerId) : undefined,
  );
}

/** Distribuidor: detalle de cliente; admin/técnico: sucursal del cliente. */
export function hrefForClient(
  clientId: number | null | undefined,
  clients: ClientResponse[],
  role: Role,
): string | undefined {
  if (clientId == null) return undefined;
  const client = clients.find((c) => c.id === clientId);
  if (!client) return undefined;
  return hrefFirstAccessible(role, [
    clientPath(client.id),
    branchPath(client.branchId),
  ]);
}

export function hrefForBranch(
  branchId: number | null | undefined,
  role: Role,
): string | undefined {
  return hrefIfAccessible(
    role,
    branchId != null ? branchPath(branchId) : undefined,
  );
}

export function hrefForTechnicianUser(
  userId: number | null | undefined,
  role: Role,
): string | undefined {
  return hrefIfAccessible(
    role,
    userId != null ? userPath(userId) : undefined,
  );
}

export function hrefForSeal(
  sealId: number | null | undefined,
  role: Role,
): string | undefined {
  return hrefIfAccessible(
    role,
    sealId != null ? sealPath(sealId) : undefined,
  );
}

export function hrefForDistributor(
  distributorId: number | null | undefined,
  distributors: DistributorResponse[],
  role: Role,
): string | undefined {
  if (distributorId == null) return undefined;
  const distributor = distributors.find((d) => d.id === distributorId);
  if (!distributor) return undefined;
  return hrefIfAccessible(role, branchPath(distributor.branchId));
}

export function hrefForBranchClientDistributor(
  branch: BranchWithRoles,
  distributors: DistributorResponse[],
  role: Role,
): string | undefined {
  return hrefForDistributor(branch.client?.distributorId, distributors, role);
}

export function hrefForServiceCenter(
  serviceCenterId: number,
  serviceCenters: ServiceCenterResponse[],
  role: Role,
): string | undefined {
  const serviceCenter = serviceCenters.find((sc) => sc.id === serviceCenterId);
  if (!serviceCenter) return undefined;
  return hrefIfAccessible(role, branchPath(serviceCenter.branchId));
}
