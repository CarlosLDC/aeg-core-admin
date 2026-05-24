import { describe, expect, it } from "vitest";
import {
  eligibleRolesForBranch,
  resolveUserBranchId,
  validateUserCreateForm,
  validateUserEditForm,
} from "@/lib/user-form";

const distributors = [
  { id: 5, branchId: 10, createdAt: "2026-01-01T00:00:00Z" },
  { id: 8, branchId: 20, createdAt: "2026-01-01T00:00:00Z" },
];
const serviceCenters = [
  { id: 3, branchId: 20, createdAt: "2026-01-01T00:00:00Z" },
];

describe("validateUserCreateForm branch role eligibility", () => {
  it("rejects DISTRIBUTOR when branch has no distributor role", () => {
    const error = validateUserCreateForm(
      {
        name: "Usuario Distribuidor",
        email: "dist@aeg.local",
        password: "secret1",
        role: "DISTRIBUTOR",
        branchId: "99",
      },
      { distributors, serviceCenters },
    );
    expect(error).toMatch(/no tiene roles operativos/i);
  });

  it("accepts DISTRIBUTOR when branch matches distributor catalog", () => {
    const error = validateUserCreateForm(
      {
        name: "Usuario Distribuidor",
        email: "dist@aeg.local",
        password: "secret1",
        role: "DISTRIBUTOR",
        branchId: "10",
      },
      { distributors, serviceCenters },
    );
    expect(error).toBeNull();
  });

  it("accepts TECHNICIAN when branch has service center role", () => {
    const error = validateUserCreateForm(
      {
        name: "Usuario Técnico",
        email: "tech@aeg.local",
        password: "secret1",
        role: "TECHNICIAN",
        branchId: "20",
      },
      { distributors, serviceCenters },
    );
    expect(error).toBeNull();
  });

  it("accepts ADMIN without branch", () => {
    const error = validateUserCreateForm(
      {
        name: "Administrador",
        email: "admin@aeg.local",
        password: "secret1",
        role: "ADMIN",
        branchId: "",
      },
      { distributors, serviceCenters },
    );
    expect(error).toBeNull();
    expect(resolveUserBranchId("ADMIN", "")).toBeNull();
  });
});

describe("validateUserEditForm", () => {
  it("accepts ADMIN without branch", () => {
    const error = validateUserEditForm(
      {
        name: "Administrador",
        email: "admin@aeg.local",
        password: "",
        role: "ADMIN",
        branchId: "",
      },
      { distributors, serviceCenters },
    );
    expect(error).toBeNull();
  });
});

describe("eligibleRolesForBranch", () => {
  it("returns roles from branch role catalogs", () => {
    expect(eligibleRolesForBranch("10", { distributors, serviceCenters })).toEqual([
      "DISTRIBUTOR",
    ]);
    expect(eligibleRolesForBranch("20", { distributors, serviceCenters })).toEqual([
      "DISTRIBUTOR",
      "SERVICE_CENTER",
      "TECHNICIAN",
    ]);
  });
});
