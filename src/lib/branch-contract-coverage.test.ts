import { describe, expect, it } from "vitest";
import {
  branchMissingContractMessage,
  buildContractPartyCoverage,
  getBranchMissingContractKinds,
  missingContractLabels,
} from "./branch-contract-coverage";
import type { BranchWithRoles } from "@/types/branch";

const baseBranch: BranchWithRoles = {
  id: 1,
  companyId: 10,
  city: "Caracas",
  state: "Distrito Capital",
  address: "",
  phone: "",
  email: "",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("buildContractPartyCoverage", () => {
  it("indexes party ids from contract lists", () => {
    const coverage = buildContractPartyCoverage(
      [{ distributorId: 5 } as never],
      [{ serviceCenterId: 8 } as never],
    );
    expect(coverage.distributorIds.has(5)).toBe(true);
    expect(coverage.serviceCenterIds.has(8)).toBe(true);
  });
});

describe("getBranchMissingContractKinds", () => {
  const coverage = buildContractPartyCoverage([], []);

  it("returns empty for client-only branches", () => {
    expect(
      getBranchMissingContractKinds(
        { ...baseBranch, client: { id: 1, branchId: 1 } as never },
        coverage,
      ),
    ).toEqual([]);
  });

  it("flags distributor without contract", () => {
    expect(
      getBranchMissingContractKinds(
        { ...baseBranch, distributor: { id: 3, branchId: 1 } as never },
        coverage,
      ),
    ).toEqual(["distributor"]);
  });

  it("flags only missing roles when one contract exists", () => {
    const partial = buildContractPartyCoverage(
      [{ distributorId: 3 } as never],
      [],
    );
    expect(
      getBranchMissingContractKinds(
        {
          ...baseBranch,
          distributor: { id: 3, branchId: 1 } as never,
          serviceCenter: { id: 9, branchId: 1 } as never,
        },
        partial,
      ),
    ).toEqual(["serviceCenter"]);
  });
});

describe("branchMissingContractMessage", () => {
  it("formats single and multiple missing contracts", () => {
    expect(
      branchMissingContractMessage(missingContractLabels(["distributor"])),
    ).toBe("Falta contrato de distribuidora.");
    expect(
      branchMissingContractMessage(
        missingContractLabels(["distributor", "serviceCenter"]),
      ),
    ).toBe("Faltan contratos de distribuidora y centro de servicio.");
  });
});
