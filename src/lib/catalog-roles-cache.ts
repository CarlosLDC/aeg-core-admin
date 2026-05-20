import { fetchClients } from "@/lib/clients-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import type {
  ClientResponse,
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";

export type CatalogRolesSnapshot = {
  distributors: DistributorResponse[];
  clients: ClientResponse[];
  serviceCenters: ServiceCenterResponse[];
};

let cached: CatalogRolesSnapshot | null = null;
let loadPromise: Promise<CatalogRolesSnapshot> | null = null;

export function invalidateCatalogRoles(): void {
  cached = null;
  loadPromise = null;
}

export async function loadCatalogRoles(
  force = false,
): Promise<CatalogRolesSnapshot> {
  if (!force && cached) {
    return cached;
  }
  if (!force && loadPromise) {
    return loadPromise;
  }

  loadPromise = Promise.all([
    fetchDistributors(),
    fetchClients(),
    fetchServiceCenters(),
  ]).then(([distributors, clients, serviceCenters]) => {
    cached = { distributors, clients, serviceCenters };
    return cached;
  });

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}
