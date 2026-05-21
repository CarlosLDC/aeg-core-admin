import { describe, expect, it } from "vitest";
import {
  findDistributorForBranch,
  validateUserCreateForm,
} from "@/lib/user-form";

const distributors = [
  { id: 5, branchId: 10, createdAt: "2026-01-01T00:00:00Z" },
  { id: 8, branchId: 20, createdAt: "2026-01-01T00:00:00Z" },
];

describe("validateUserCreateForm distributor branch rule", () => {
  it("rejects DISTRIBUTOR when branch has no distributor role", () => {
    const error = validateUserCreateForm(
      {
        username: "dist@aeg.local",
        password: "secret1",
        role: "DISTRIBUTOR",
        branchId: "99",
        distributorId: "5",
      },
      { distributors },
    );
    expect(error).toMatch(/rol de distribuidor/i);
  });

  it("accepts DISTRIBUTOR when branch matches distributor catalog", () => {
    const error = validateUserCreateForm(
      {
        username: "dist@aeg.local",
        password: "secret1",
        role: "DISTRIBUTOR",
        branchId: "10",
        distributorId: "5",
      },
      { distributors },
    );
    expect(error).toBeNull();
  });
});

describe("findDistributorForBranch", () => {
  it("returns distributor linked to branch", () => {
    expect(findDistributorForBranch("20", distributors)?.id).toBe(8);
  });
});
