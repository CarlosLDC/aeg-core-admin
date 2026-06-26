import { describe, expect, it } from "vitest";
import { branchWizardNeedsContracts } from "@/lib/branch-wizard-contracts";

describe("branchWizardNeedsContracts", () => {
  it("requires contracts for distributor and service center roles", () => {
    expect(branchWizardNeedsContracts({ organizationRole: "DISTRIBUTOR" })).toBe(
      true,
    );
    expect(branchWizardNeedsContracts({ organizationRole: "SERVICE_CENTER" })).toBe(
      true,
    );
    expect(branchWizardNeedsContracts({ organizationRole: "NONE" })).toBe(false);
  });
});
