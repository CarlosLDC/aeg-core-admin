import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isDistributorClientOnlyRoles,
  linkDistributorClientToBranch,
} from "./client-link";
import { distributorClientRoles } from "./client-onboarding";

vi.mock("@/lib/clients-api", () => ({
  createClient: vi.fn(),
  fetchClientByBranchId: vi.fn(),
  updateClient: vi.fn(),
}));

import {
  createClient,
  fetchClientByBranchId,
  updateClient,
} from "@/lib/clients-api";
import { ApiError } from "@/types/auth";

describe("isDistributorClientOnlyRoles", () => {
  it("detects distributor client registration", () => {
    expect(isDistributorClientOnlyRoles(distributorClientRoles(3))).toBe(true);
    expect(
      isDistributorClientOnlyRoles({
        isClient: true,
        isDistributor: true,
        isServiceCenter: false,
        clientDistributorId: "1",
      }),
    ).toBe(false);
  });
});

describe("linkDistributorClientToBranch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates client when branch has no link", async () => {
    vi.mocked(fetchClientByBranchId).mockResolvedValue(null);
    vi.mocked(createClient).mockResolvedValue({
      id: 1,
      branchId: 10,
      distributorId: 3,
      createdAt: "",
    });

    await linkDistributorClientToBranch(10, distributorClientRoles(3));

    expect(createClient).toHaveBeenCalledWith({
      branchId: 10,
      distributorId: 3,
    });
  });

  it("no-ops when already linked to same distributor", async () => {
    vi.mocked(fetchClientByBranchId).mockResolvedValue({
      id: 5,
      branchId: 10,
      distributorId: 3,
      createdAt: "",
    });

    await linkDistributorClientToBranch(10, distributorClientRoles(3));

    expect(createClient).not.toHaveBeenCalled();
  });

  it("links via POST when branch has client without distributor", async () => {
    vi.mocked(fetchClientByBranchId).mockResolvedValue({
      id: 5,
      branchId: 10,
      distributorId: undefined,
      createdAt: "",
    });
    vi.mocked(createClient).mockResolvedValue({
      id: 5,
      branchId: 10,
      distributorId: 3,
      createdAt: "",
    });

    await linkDistributorClientToBranch(10, distributorClientRoles(3));

    expect(createClient).toHaveBeenCalledWith({
      branchId: 10,
      distributorId: 3,
    });
  });

  it("on recoverable error, completes link with PUT when client row exists", async () => {
    vi.mocked(fetchClientByBranchId)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 5,
        branchId: 10,
        distributorId: undefined,
        createdAt: "",
      });
    vi.mocked(createClient).mockRejectedValue(
      new ApiError("Binding property is null", 400),
    );
    vi.mocked(updateClient).mockResolvedValue({
      id: 5,
      branchId: 10,
      distributorId: 3,
      createdAt: "",
    });

    await linkDistributorClientToBranch(10, distributorClientRoles(3));

    expect(updateClient).toHaveBeenCalledWith(5, {
      branchId: 10,
      distributorId: 3,
    });
  });
});
