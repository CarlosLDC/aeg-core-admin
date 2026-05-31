import { describe, expect, it, vi, beforeEach } from "vitest";
import { emptyBranchWizardForm } from "@/components/branches/branch-wizard-types";
import {
  branchWizardNeedsContracts,
  createBranchWizardContracts,
  validateBranchWizardContracts,
} from "./branch-wizard-contracts";

vi.mock("@/lib/distributor-contracts-api", () => ({
  createDistributorContract: vi.fn(),
}));

vi.mock("@/lib/service-center-contracts-api", () => ({
  createServiceCenterContract: vi.fn(),
}));

import { createDistributorContract } from "@/lib/distributor-contracts-api";
import { createServiceCenterContract } from "@/lib/service-center-contracts-api";

const validDraft = {
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  photoUrls: ["https://example.com/doc.pdf"],
};

describe("branchWizardNeedsContracts", () => {
  it("is true when distributor or service center role is set", () => {
    expect(
      branchWizardNeedsContracts({ isDistributor: true, isServiceCenter: false }),
    ).toBe(true);
    expect(
      branchWizardNeedsContracts({ isDistributor: false, isServiceCenter: true }),
    ).toBe(true);
    expect(
      branchWizardNeedsContracts({ isDistributor: false, isServiceCenter: false }),
    ).toBe(false);
  });
});

describe("validateBranchWizardContracts", () => {
  it("requires contract per active role", () => {
    const values = {
      ...emptyBranchWizardForm(),
      isDistributor: true,
      distributorContract: {
        startDate: "",
        endDate: "",
        photoUrls: [],
      },
    };
    expect(
      validateBranchWizardContracts(values, {
        isDistributor: true,
        isServiceCenter: false,
      }),
    ).toMatch(/Contrato de distribuidora/);
  });

  it("passes when both role contracts are complete", () => {
    const values = {
      ...emptyBranchWizardForm(),
      isDistributor: true,
      isServiceCenter: true,
      distributorContract: validDraft,
      serviceCenterContract: validDraft,
    };
    expect(
      validateBranchWizardContracts(values, {
        isDistributor: true,
        isServiceCenter: true,
      }),
    ).toBeNull();
  });
});

describe("createBranchWizardContracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createDistributorContract).mockResolvedValue({ id: 101 } as never);
    vi.mocked(createServiceCenterContract).mockResolvedValue({ id: 202 } as never);
  });

  it("creates contracts with party ids from branch roles", async () => {
    const values = {
      ...emptyBranchWizardForm(),
      distributorContract: validDraft,
      serviceCenterContract: validDraft,
    };

    const result = await createBranchWizardContracts({
      values,
      roles: { isDistributor: true, isServiceCenter: true },
      distributorId: 5,
      serviceCenterId: 8,
    });

    expect(createDistributorContract).toHaveBeenCalledWith({
      distributorId: 5,
      startDate: validDraft.startDate,
      endDate: validDraft.endDate,
      photoUrls: validDraft.photoUrls,
    });
    expect(createServiceCenterContract).toHaveBeenCalledWith({
      serviceCenterId: 8,
      startDate: validDraft.startDate,
      endDate: validDraft.endDate,
      photoUrls: validDraft.photoUrls,
    });
    expect(result).toEqual({
      distributorContractId: 101,
      serviceCenterContractId: 202,
    });
  });
});
