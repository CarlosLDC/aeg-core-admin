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
}));

vi.mock("@/lib/branch-roles", () => ({
  syncBranchRoles: vi.fn(),
}));

import { resolveCompanyIdForRif } from "@/lib/company-rif";
import { createBranch } from "@/lib/branches-api";
import { syncBranchRoles } from "@/lib/branch-roles";

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
  });

  it("creates company, branch and syncs roles", async () => {
    vi.mocked(resolveCompanyIdForRif).mockResolvedValue({
      companyId: 10,
      companyCreated: true,
    });
    vi.mocked(createBranch).mockResolvedValue({
      id: 20,
      companyId: 10,
      city: "Caracas",
      state: "Miranda",
      address: "",
      phone: "",
      email: "",
      createdAt: "",
    });
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

    expect(resolveCompanyIdForRif).toHaveBeenCalledOnce();
    expect(createBranch).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 10, phone: "0412" }),
    );
    expect(syncBranchRoles).toHaveBeenCalledWith(
      20,
      null,
      distributorClientRoles(5),
    );
    expect(result.branch.id).toBe(20);
    expect(result.companyCreated).toBe(true);
    expect(result.companyLinkedExisting).toBe(false);
  });

  it("links existing company when resolve returns no create", async () => {
    vi.mocked(resolveCompanyIdForRif).mockResolvedValue({
      companyId: 77,
      companyCreated: false,
    });
    vi.mocked(createBranch).mockResolvedValue({
      id: 21,
      companyId: 77,
      city: "Valencia",
      state: "Carabobo",
      address: "",
      phone: "",
      email: "",
      createdAt: "",
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

    expect(result.companyLinkedExisting).toBe(true);
    expect(result.companyCreated).toBe(false);
    expect(createBranch).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 77 }),
    );
  });
});
