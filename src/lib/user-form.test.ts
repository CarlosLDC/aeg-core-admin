import { describe, expect, it } from "vitest";
import {
  normalizeNationalId,
  resolveUserBranchId,
  resolveUserDistributorId,
  resolveUserNationalId,
  validateUserCreateForm,
  validateUserEditForm,
} from "@/lib/user-form";

const baseForm = {
  name: "Usuario",
  email: "user@aeg.local",
  password: "secret1",
  distributorId: "",
  branchId: "",
  nationalId: "",
};

describe("validateUserCreateForm", () => {
  it("accepts TECHNICIAN with distributor and national id", () => {
    const error = validateUserCreateForm({
      ...baseForm,
      role: "TECHNICIAN",
      distributorId: "7",
      nationalId: "V12345678",
    });
    expect(error).toBeNull();
    expect(resolveUserDistributorId("TECHNICIAN", "7")).toBe(7);
    expect(resolveUserNationalId("TECHNICIAN", "V12345678")).toBe("V12345678");
  });

  it("accepts DISTRIBUTOR with distributor and national id", () => {
    const error = validateUserCreateForm({
      ...baseForm,
      role: "DISTRIBUTOR",
      distributorId: "7",
      nationalId: "V12345678",
    });
    expect(error).toBeNull();
  });

  it("requires SERVICE_CENTER branch", () => {
    const error = validateUserCreateForm({
      ...baseForm,
      role: "SERVICE_CENTER",
      branchId: "",
    });
    expect(error).toMatch(/sucursal/i);
    expect(resolveUserBranchId("SERVICE_CENTER", "12")).toBe(12);
  });

  it("rejects TECHNICIAN without distributor", () => {
    const error = validateUserCreateForm({
      ...baseForm,
      role: "TECHNICIAN",
      distributorId: "",
      nationalId: "V12345678",
    });
    expect(error).toMatch(/distribuidora/i);
  });

  it("accepts ADMIN without distributor or national id", () => {
    const error = validateUserCreateForm({
      ...baseForm,
      role: "ADMIN",
    });
    expect(error).toBeNull();
    expect(resolveUserDistributorId("ADMIN", "")).toBeNull();
  });
});

describe("validateUserEditForm", () => {
  it("accepts ADMIN without distributor or national id", () => {
    const error = validateUserEditForm({
      ...baseForm,
      role: "ADMIN",
      password: "",
    });
    expect(error).toBeNull();
  });
});

describe("normalizeNationalId", () => {
  it("strips whitespace", () => {
    expect(normalizeNationalId(" V 12 345 678 ")).toBe("V12345678");
  });
});
