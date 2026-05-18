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
} from "@/lib/distributors-api";
import {
  createServiceCenter,
  deleteServiceCenter,
  fetchServiceCenters,
} from "@/lib/service-centers-api";
import { getCatalogForbiddenMessage } from "@/lib/api-permissions";
import { ApiError } from "@/types/auth";
import { formatBranchShort } from "@/lib/branches";
import type { BranchResponse, BranchWithRoles } from "@/types/branch";
import type {
  ClientResponse,
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";

export type BranchRoleFormState = {
  isDistributor: boolean;
  isClient: boolean;
  isServiceCenter: boolean;
  clientDistributorId: string;
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
  }));
}

export function distributorLabel(
  distributor: DistributorResponse,
  branches: BranchResponse[],
  companies: CompanyResponse[],
): string {
  const branch = branches.find((b) => b.id === distributor.branchId);
  if (!branch) return `Distribuidor #${distributor.id}`;
  return formatBranchShort(branch, companies);
}

export async function syncBranchRoles(
  branchId: number,
  previous: BranchWithRoles | null,
  roles: BranchRoleFormState,
): Promise<void> {
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
    } satisfies BranchResponse);

  let clientDistributorId = roles.clientDistributorId
    ? Number(roles.clientDistributorId)
    : undefined;

  if (roles.isDistributor && !prev.distributor) {
    const created = await createDistributor({ branchId });
    if (roles.isClient && clientDistributorId == null) {
      clientDistributorId = created.id;
    }
  } else if (!roles.isDistributor && prev.distributor) {
    await deleteDistributor(prev.distributor.id);
  }

  if (roles.isServiceCenter && !prev.serviceCenter) {
    await createServiceCenter({ branchId });
  } else if (!roles.isServiceCenter && prev.serviceCenter) {
    await deleteServiceCenter(prev.serviceCenter.id);
  }

  if (roles.isClient && !prev.client) {
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
  const [branch, distributors, clients, serviceCenters] = await Promise.all([
    fetchBranchById(id),
    fetchDistributors(),
    fetchClients(),
    fetchServiceCenters(),
  ]);

  const merged = mergeBranchesWithRoles(
    [branch],
    distributors,
    clients,
    serviceCenters,
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
