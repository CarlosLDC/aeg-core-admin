import { describe, expect, it } from "vitest";
import { emptyBranchWizardForm } from "@/components/branches/branch-wizard-types";
import {
  branchWizardNeedsContracts,
  createBranchWizardContracts,
  hasBranchWizardContractDraftData,
  validateBranchWizardContracts,
} from "@/lib/branch-wizard-contracts";

describe("branchWizardNeedsContracts", () => {
  it("identifies distributor and service center roles as contract-eligible", () => {
    expect(branchWizardNeedsContracts({ organizationRole: "DISTRIBUTOR" })).toBe(
      true,
    );
    expect(branchWizardNeedsContracts({ organizationRole: "SERVICE_CENTER" })).toBe(
      true,
    );
    expect(branchWizardNeedsContracts({ organizationRole: "NONE" })).toBe(false);
  });
});

describe("hasBranchWizardContractDraftData", () => {
  it("returns false for an empty draft and true when any field is filled", () => {
    expect(
      hasBranchWizardContractDraftData({
        startDate: " ",
        endDate: "",
        photoUrls: [],
      }),
    ).toBe(false);
    expect(
      hasBranchWizardContractDraftData({
        startDate: "2026-01-01",
        endDate: "",
        photoUrls: [],
      }),
    ).toBe(true);
    expect(
      hasBranchWizardContractDraftData({
        startDate: "",
        endDate: "2027-01-01",
        photoUrls: [],
      }),
    ).toBe(true);
    expect(
      hasBranchWizardContractDraftData({
        startDate: "",
        endDate: "",
        photoUrls: ["https://example.com/contract.pdf"],
      }),
    ).toBe(true);
  });
});

describe("validateBranchWizardContracts", () => {
  it("allows empty contract drafts for distributor and service center roles", () => {
    const form = emptyBranchWizardForm();
    expect(
      validateBranchWizardContracts(form, { organizationRole: "DISTRIBUTOR" }),
    ).toBeNull();
    expect(
      validateBranchWizardContracts(form, { organizationRole: "SERVICE_CENTER" }),
    ).toBeNull();
  });

  it("validates partial contract drafts when the user starts filling one", () => {
    const form = emptyBranchWizardForm();
    form.distributorContract.startDate = "2026-01-01";
    expect(
      validateBranchWizardContracts(form, { organizationRole: "DISTRIBUTOR" }),
    ).toContain("Contrato de distribuidora:");
  });
});

describe("createBranchWizardContracts", () => {
  it("skips contract creation when drafts are empty", async () => {
    const form = emptyBranchWizardForm();
    await expect(
      createBranchWizardContracts({
        values: form,
        roles: { organizationRole: "DISTRIBUTOR" },
        distributorId: 10,
      }),
    ).resolves.toEqual({});
    await expect(
      createBranchWizardContracts({
        values: form,
        roles: { organizationRole: "SERVICE_CENTER" },
        serviceCenterId: 20,
      }),
    ).resolves.toEqual({});
  });
});
