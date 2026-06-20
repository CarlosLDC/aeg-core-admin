import { canAccessRoute } from "@/lib/permissions/routes";
import {
  annualInspectionPath,
  branchPath,
  companyPath,
  distributorContractPath,
  printerModelPath,
  printerPath,
  sealPath,
  serviceCenterContractPath,
  technicalServicePath,
} from "@/lib/resource-routes";
import { hrefForClient } from "@/lib/table-foreign-hrefs";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse } from "@/types/branch-role";
import type { Role } from "@/types/user";

export function resolveNotificationHref(
  role: Role,
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  return canAccessRoute(role, path) ? path : null;
}

export function notificationHrefForBranch(
  branch: BranchResponse,
  role: Role,
  clients: ClientResponse[],
): string | null {
  if (role === "TECHNICIAN") {
    const client = clients.find((c) => c.branchId === branch.id);
    if (client) {
      return resolveNotificationHref(
        role,
        hrefForClient(client.id, clients, role),
      );
    }
  }
  return resolveNotificationHref(role, branchPath(branch.id));
}

export function notificationHrefForCompany(
  companyId: number,
  role: Role,
  branches: BranchResponse[],
  clients: ClientResponse[],
): string | null {
  const branch = branches.find((b) => b.companyId === companyId);
  if (branch) return notificationHrefForBranch(branch, role, clients);
  return resolveNotificationHref(role, companyPath(companyId));
}
