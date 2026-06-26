import { describe, expect, it } from "vitest";
import {
  organizationRoleFromBranch,
  validateBranchRoleSelection,
} from "@/lib/organization-roles";

describe("organizationRoleFromBranch", () => {
  it("prefers organizationRole when present", () => {
    expect(
      organizationRoleFromBranch({
        organizationRole: "DISTRIBUTOR",
        serviceCenter: { id: 1 },
      }),
    ).toBe("DISTRIBUTOR");
  });

  it("falls back to catalog records", () => {
    expect(
      organizationRoleFromBranch({
        distributor: { id: 1, branchId: 2, createdAt: "" },
      }),
    ).toBe("DISTRIBUTOR");
    expect(
      organizationRoleFromBranch({
        serviceCenter: { id: 1, branchId: 2, createdAt: "" },
      }),
    ).toBe("SERVICE_CENTER");
  });
});

describe("validateBranchRoleSelection", () => {
  it("rejects operational roles on factory companies", () => {
    expect(
      validateBranchRoleSelection("DISTRIBUTOR", false, true),
    ).toMatch(/fábrica/i);
  });

  it("allows client-only branches", () => {
    expect(validateBranchRoleSelection("NONE", true, false)).toBeNull();
  });
});
