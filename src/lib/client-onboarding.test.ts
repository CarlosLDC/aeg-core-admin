import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createClientOnboarding,
  distributorClientRoles,
} from "./client-onboarding";

vi.mock("@/lib/companies-api", () => ({
  createCompany: vi.fn(),
}));

vi.mock("@/lib/branches-api", () => ({
  createBranch: vi.fn(),
}));

vi.mock("@/lib/branch-roles", () => ({
  syncBranchRoles: vi.fn(),
}));

import { createCompany } from "@/lib/companies-api";
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
    vi.mocked(createCompany).mockResolvedValue({
      id: 10,
      businessName: "ACME",
      rif: "J123456789",
      contributorType: "ordinario",
      createdAt: "",
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

    expect(createCompany).toHaveBeenCalledOnce();
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
  });
});
