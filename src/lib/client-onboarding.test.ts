import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createClientOnboarding,
  distributorClientRoles,
} from "./client-onboarding";
import { mockClient } from "@/lib/test-fixtures";

vi.mock("@/lib/company-rif", () => ({
  resolveCompanyIdForRif: vi.fn(),
}));

vi.mock("@/lib/branches-api", () => ({
  createBranch: vi.fn(),
  lookupBranchByCompanyLocation: vi.fn(),
  fetchBranchById: vi.fn(),
  updateBranch: vi.fn(),
}));

vi.mock("@/lib/companies-api", () => ({
  updateCompany: vi.fn(),
}));

vi.mock("@/lib/clients-api", () => ({
  fetchClients: vi.fn(),
  fetchClientByBranchId: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
}));

vi.mock("@/lib/distributors-api", () => ({
  fetchDistributors: vi.fn(),
  fetchDistributorById: vi.fn(),
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
  updateBranch,
} from "@/lib/branches-api";
import { updateCompany } from "@/lib/companies-api";
import { syncBranchRoles } from "@/lib/branch-roles";
import {
  createClient,
  fetchClientByBranchId,
  fetchClients,
} from "@/lib/clients-api";
import { ApiError } from "@/types/auth";
import {
  fetchDistributorById,
  fetchDistributors,
} from "@/lib/distributors-api";
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
    vi.mocked(fetchDistributorById).mockImplementation(async (id) => ({
      id,
      branchId: id === 5 ? 99 : 1,
      createdAt: "",
    }));
    vi.mocked(fetchServiceCenters).mockResolvedValue([]);
    vi.mocked(fetchClientByBranchId).mockResolvedValue(null);
    vi.mocked(createClient).mockResolvedValue(
      mockClient({ id: 1, branchId: 20, distributorId: 5 }),
    );
    vi.mocked(updateBranch).mockImplementation(async (id, body) => ({
      ...branchRow,
      id,
      companyId: body.companyId,
      city: body.city,
      state: body.state,
      address: body.address ?? "",
      phone: body.phone ?? "",
      email: body.email ?? "",
      contactPersonName: body.contactPersonName,
    }));
    vi.mocked(updateCompany).mockResolvedValue({
      id: 10,
      businessName: "ACME",
      rif: "J123456789",
      contributorType: "ordinario",
      createdAt: "",
    });
  });

  it("empresa nueva: crea empresa, sucursal y cliente del distribuidor", async () => {
    vi.mocked(resolveCompanyIdForRif).mockResolvedValue({
      companyId: 10,
      companyCreated: true,
    });
    vi.mocked(createBranch).mockResolvedValue(branchRow);
    const result = await createClientOnboarding({
      values: {
        rif: "J123456789",
        businessName: "ACME",
        contributorType: "ordinario",
        linkedCompanyId: null,
        city: "Caracas",
        state: "Miranda",
        address: "",
        contactPersonName: "Ana López",
        phone: "0412",
        email: "a@test.com",
      },
      companies: [],
      roles: distributorClientRoles(5),
    });

    expect(createBranch).toHaveBeenCalledWith({
      companyId: 10,
      city: "Caracas",
      state: "Miranda",
      address: undefined,
      contactPersonName: "Ana López",
      phone: "0412",
      email: "a@test.com",
    });
    expect(createClient).toHaveBeenCalledWith({
      branchId: 20,
      distributorId: 5,
    });
    expect(syncBranchRoles).not.toHaveBeenCalled();
    expect(result.companyCreated).toBe(true);
    expect(result.branchLinkedExisting).toBe(false);
  });

  it("distribuidor: bloquea re-alta si la sucursal existe sin vínculo de cliente", async () => {
    vi.mocked(resolveCompanyIdForRif).mockResolvedValue({
      companyId: 77,
      companyCreated: false,
    });
    vi.mocked(createBranch).mockRejectedValue(
      new ApiError("Sucursal ya está registrada", 409),
    );
    vi.mocked(lookupBranchByCompanyLocation).mockResolvedValue({
      ...branchRow,
      id: 322,
      companyId: 77,
      city: "Valencia",
      state: "Carabobo",
      contactPersonName: "Viejo contacto",
    });
    vi.mocked(fetchClientByBranchId).mockResolvedValue(null);
    await expect(
      createClientOnboarding({
        values: {
          rif: "J315694205",
          businessName: "ACME",
          contributorType: "ordinario",
          linkedCompanyId: null,
          city: "Valencia",
          state: "Carabobo",
          address: "",
          contactPersonName: "Ana López",
          phone: "",
          email: "",
        },
        companies: [
          {
            id: 77,
            businessName: "ACME vieja",
            rif: "J315694205",
            contributorType: "ordinario",
            createdAt: "",
          },
        ],
        roles: distributorClientRoles(5),
      }),
    ).rejects.toThrow(/no es posible darlo de alta de nuevo/i);

    expect(createBranch).toHaveBeenCalled();
    expect(lookupBranchByCompanyLocation).toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("admin puede sincronizar catálogo al reutilizar sucursal", async () => {
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
    const result = await createClientOnboarding({
      values: {
        rif: "J315694205",
        businessName: "ACME",
        contributorType: "ordinario",
        linkedCompanyId: null,
        city: "Valencia",
        state: "Carabobo",
        address: "",
        contactPersonName: "Ana López",
        phone: "",
        email: "",
      },
      companies: [],
      roles: {
        isClient: true,
        isDistributor: true,
        isServiceCenter: false,
        clientDistributorId: "5",
      },
    });

    expect(updateCompany).toHaveBeenCalledWith(77, {
      rif: "J315694205",
      businessName: "ACME",
      contributorType: "ordinario",
    });
    expect(updateBranch).toHaveBeenCalled();
    expect(result.branchLinkedExisting).toBe(true);
  });

  it("reintento: solo vincula cliente cuando resumeBranchId está definido", async () => {
    vi.mocked(fetchBranchById).mockResolvedValue({
      ...branchRow,
      id: 322,
      companyId: 77,
      city: "Valencia",
      state: "Carabobo",
      contactPersonName: "Viejo contacto",
    });
    const linkedClient = mockClient({ id: 9, branchId: 322, distributorId: 5 });
    let fetchClientCalls = 0;
    vi.mocked(fetchClientByBranchId).mockImplementation(async () => {
      fetchClientCalls += 1;
      return fetchClientCalls === 1 ? null : linkedClient;
    });
    vi.mocked(createClient).mockResolvedValue(linkedClient);

    const result = await createClientOnboarding({
      values: {
        rif: "J315694205",
        businessName: "ACME",
        contributorType: "ordinario",
        linkedCompanyId: null,
        city: "Valencia",
        state: "Carabobo",
        address: "",
        contactPersonName: "Ana López",
        phone: "",
        email: "",
      },
      companies: [
        {
          id: 77,
          businessName: "ACME vieja",
          rif: "J315694205",
          contributorType: "ordinario",
          createdAt: "",
        },
      ],
      resumeBranchId: 322,
      roles: distributorClientRoles(5),
    });

    expect(resolveCompanyIdForRif).not.toHaveBeenCalled();
    expect(createBranch).not.toHaveBeenCalled();
    expect(updateCompany).not.toHaveBeenCalled();
    expect(updateBranch).not.toHaveBeenCalled();
    expect(createClient).toHaveBeenCalledWith({
      branchId: 322,
      distributorId: 5,
    });
    expect(result.branch.id).toBe(322);
    expect(result.branchLinkedExisting).toBe(true);
  });

});
