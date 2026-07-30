import { loadCatalogRoles } from "@/lib/catalog-roles-cache";
import { fetchBranchById } from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import {
  createClient,
  deleteClient,
  updateClient,
} from "@/lib/clients-api";
import {
  createDistributor,
  deleteDistributor,
  fetchDistributors,
  updateDistributor,
} from "@/lib/distributors-api";
import {
  createServiceCenter,
  deleteServiceCenter,
  fetchServiceCenters,
} from "@/lib/service-centers-api";
import { getCatalogForbiddenMessage } from "@/lib/api-permissions";
import { organizationRoleFromBranch } from "@/lib/organization-roles";
import { ApiError } from "@/types/auth";
import { formatBranchShort } from "@/lib/branches";
import type { BranchResponse, BranchWithRoles } from "@/types/branch";
import type {
  ClientResponse,
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { BranchOrganizationRole } from "@/types/organization";

export type BranchRoleFormState = {
  organizationRole: BranchOrganizationRole;
  isClient: boolean;
  clientDistributorId: string;
  /** Solo aplica cuando organizationRole === DISTRIBUTOR. Default true. */
  canWriteAnnualInspection: boolean;
};

export function mergeBranchesWithRoles(
  branches: BranchResponse[],
  distributors: DistributorResponse[],
  clients: ClientResponse[],
  serviceCenters: ServiceCenterResponse[],
): BranchWithRoles[] {
  const distributorByBranch = new Map(
    distributors.map((d) => [d.branchId, d]),
  );
  const clientByBranch = new Map(clients.map((c) => [c.branchId, c]));
  const serviceCenterByBranch = new Map(
    serviceCenters.map((s) => [s.branchId, s]),
  );

  return branches.map((branch) => ({
    ...branch,
    distributor: distributorByBranch.get(branch.id),
    client: clientByBranch.get(branch.id),
    serviceCenter: serviceCenterByBranch.get(branch.id),
    organizationRole: organizationRoleFromBranch({
      organizationRole: branch.organizationRole,
      distributor: distributorByBranch.get(branch.id),
      serviceCenter: serviceCenterByBranch.get(branch.id),
    }),
  }));
}

export function distributorLabel(
  distributor: DistributorResponse,
  branches: BranchResponse[],
  companies: CompanyResponse[],
  extraBranches: BranchResponse[] = [],
): string {
  const branch =
    branches.find((b) => b.id === distributor.branchId) ??
    extraBranches.find((b) => b.id === distributor.branchId);
  if (!branch) return "Distribuidor desconocido";
  return formatBranchShort(branch, companies);
}

export function clientDistributorSummary(
  branch: BranchWithRoles,
  distributors: DistributorResponse[],
  branches: BranchResponse[],
  companies: CompanyResponse[],
): string {
  if (!branch.client?.distributorId) return "—";
  const distributor = distributors.find(
    (d) => d.id === branch.client?.distributorId,
  );
  if (!distributor) return "Distribuidor desconocido";
  return distributorLabel(distributor, branches, companies);
}

export async function syncBranchRoles(
  branchId: number,
  previous: BranchWithRoles | null,
  roles: BranchRoleFormState | import("@/lib/client-onboarding").ClientOnboardingRoleOptions,
): Promise<void> {
  const canWriteAnnualInspection = roles.canWriteAnnualInspection !== false;
  const prev: BranchWithRoles =
    previous ??
    ({
      id: branchId,
      companyId: 0,
      city: "",
      state: "",
      address: "",
      phone: "",
      email: "",
      createdAt: "",
      organizationRole: "NONE",
    } satisfies BranchResponse);

  const prevRole = organizationRoleFromBranch(prev);
  const nextRole = roles.organizationRole;

  let clientDistributorId = roles.clientDistributorId
    ? Number(roles.clientDistributorId)
    : undefined;

  if (nextRole === "DISTRIBUTOR" && prevRole !== "DISTRIBUTOR") {
    await createDistributor({
      branchId,
      canWriteAnnualInspection,
    });
    if (prevRole === "SERVICE_CENTER" && prev.serviceCenter) {
      await deleteServiceCenter(prev.serviceCenter.id);
    }
  } else if (nextRole === "DISTRIBUTOR" && prevRole === "DISTRIBUTOR" && prev.distributor) {
    const prevFlag = prev.distributor.canWriteAnnualInspection !== false;
    if (prevFlag !== canWriteAnnualInspection) {
      await updateDistributor(prev.distributor.id, {
        branchId,
        canWriteAnnualInspection,
      });
    }
  } else if (nextRole !== "DISTRIBUTOR" && prevRole === "DISTRIBUTOR" && prev.distributor) {
    await deleteDistributor(prev.distributor.id);
  }

  if (nextRole === "SERVICE_CENTER" && prevRole !== "SERVICE_CENTER") {
    await createServiceCenter({ branchId });
    if (prevRole === "DISTRIBUTOR" && prev.distributor) {
      await deleteDistributor(prev.distributor.id);
    }
  } else if (
    nextRole !== "SERVICE_CENTER" &&
    prevRole === "SERVICE_CENTER" &&
    prev.serviceCenter
  ) {
    await deleteServiceCenter(prev.serviceCenter.id);
  }

  const isDistributorBranch = nextRole === "DISTRIBUTOR";

  if (isDistributorBranch) {
    if (prev.client) {
      await deleteClient(prev.client.id);
    }
  } else if (roles.isClient && !prev.client) {
    await createClient({ branchId, distributorId: clientDistributorId });
  } else if (!roles.isClient && prev.client) {
    await deleteClient(prev.client.id);
  } else if (roles.isClient && prev.client) {
    const prevDistributorId = prev.client.distributorId;
    if (prevDistributorId !== clientDistributorId) {
      await updateClient(prev.client.id, {
        branchId,
        distributorId: clientDistributorId,
      });
    }
  }
}

export async function deleteBranchRoles(branch: BranchWithRoles): Promise<void> {
  if (branch.client) await deleteClient(branch.client.id);
  if (branch.serviceCenter) await deleteServiceCenter(branch.serviceCenter.id);
  if (branch.distributor) await deleteDistributor(branch.distributor.id);
}

export async function fetchBranchWithRolesById(
  id: number,
): Promise<BranchWithRoles> {
  const [branch, roles] = await Promise.all([
    fetchBranchById(id),
    loadCatalogRoles(),
  ]);

  const merged = mergeBranchesWithRoles(
    [branch],
    roles.distributors,
    roles.clients,
    roles.serviceCenters,
  );
  return merged[0]!;
}

export function getBranchRolesErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return getCatalogForbiddenMessage("MODIFY");
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Ha ocurrido un error al gestionar los roles de sucursal.";
}
