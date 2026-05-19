import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createClientOnboarding,
  distributorClientRoles,
} from "./client-onboarding";

vi.mock("@/lib/company-rif", () => ({
  resolveCompanyIdForRif: vi.fn(),
}));

vi.mock("@/lib/branches-api", () => ({
  createBranch: vi.fn(),
  lookupBranchByCompanyLocation: vi.fn(),
  fetchBranchById: vi.fn(),
}));

vi.mock("@/lib/clients-api", () => ({
  fetchClients: vi.fn(),
}));

vi.mock("@/lib/distributors-api", () => ({
  fetchDistributors: vi.fn(),
}));

vi.mock("@/lib/service-centers-api", () => ({
  fetchServiceCenters: vi.fn(),
}));

vi.mock("@/lib/branch-roles", () => ({
  syncBranchRoles: vi.fn(),
  mergeBranchesWithRoles: vi.fn((branches) =>
    branches.map((b: { id: number }) => ({ ...b, id: b.id })),
  ),
}));

import { resolveCompanyIdForRif } from "@/lib/company-rif";
import {
  createBranch,
  fetchBranchById,
  lookupBranchByCompanyLocation,
} from "@/lib/branches-api";
import { syncBranchRoles } from "@/lib/branch-roles";
import { fetchClients } from "@/lib/clients-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";

const branchRow = {
  id: 20,
  companyId: 10,
  city: "Caracas",
  state: "Miranda",
  address: "",
  phone: "",
  email: "",
  createdAt: "",
};

describe("distributorClientRoles", () => {
  it("marks branch as client of the distributor", () => {
    expect(distributorClientRoles(42)).toEqual({
      isClient: true,
      isDistributor: false,
      isServiceCenter: false,
      clientDistributorId: "42",
    });
  });
});

describe("createClientOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lookupBranchByCompanyLocation).mockResolvedValue(null);
    vi.mocked(fetchBranchById).mockImplementation(async (id) => ({
      ...branchRow,
      id,
    }));
    vi.mocked(fetchClients).mockResolvedValue([]);
    vi.mocked(fetchDistributors).mockResolvedValue([]);
    vi.mocked(fetchServiceCenters).mockResolvedValue([]);
  });

  it("empresa nueva: crea empresa, sucursal y cliente del distribuidor", async () => {
    vi.mocked(resolveCompanyIdForRif).mockResolvedValue({
      companyId: 10,
      companyCreated: true,
    });
    vi.mocked(createBranch).mockResolvedValue(branchRow);
    vi.mocked(syncBranchRoles).mockResolvedValue(undefined);

    const result = await createClientOnboarding({
      values: {
        rif: "J123456789",
        businessName: "ACME",
        contributorType: "ordinario",
        linkedCompanyId: null,
        city: "Caracas",
        state: "Miranda",
        address: "",
        phone: "0412",
        email: "a@test.com",
      },
      companies: [],
      roles: distributorClientRoles(5),
    });

    expect(createBranch).toHaveBeenCalledOnce();
    expect(syncBranchRoles).toHaveBeenCalled();
    expect(result.companyCreated).toBe(true);
    expect(result.branchLinkedExisting).toBe(false);
  });

  it("reutiliza sucursal existente por empresa y ubicación", async () => {
    vi.mocked(resolveCompanyIdForRif).mockResolvedValue({
      companyId: 77,
      companyCreated: false,
    });
    vi.mocked(lookupBranchByCompanyLocation).mockResolvedValue({
      ...branchRow,
      id: 322,
      companyId: 77,
      city: "Valencia",
      state: "Carabobo",
    });
    vi.mocked(syncBranchRoles).mockResolvedValue(undefined);

    const result = await createClientOnboarding({
      values: {
        rif: "J315694205",
        businessName: "ACME",
        contributorType: "ordinario",
        linkedCompanyId: null,
        city: "Valencia",
        state: "Carabobo",
        address: "",
        phone: "",
        email: "",
      },
      companies: [],
      roles: distributorClientRoles(5),
    });

    expect(createBranch).not.toHaveBeenCalled();
    expect(result.branch.id).toBe(322);
    expect(result.branchLinkedExisting).toBe(true);
  });
});
