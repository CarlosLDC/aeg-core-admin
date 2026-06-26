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
  it("accepts TECHNICIAN with branch and national id", () => {
    const error = validateUserCreateForm({
      ...baseForm,
      role: "TECHNICIAN",
      branchId: "12",
      nationalId: "V12345678",
    });
    expect(error).toBeNull();
    expect(resolveUserBranchId("TECHNICIAN", "12")).toBe(12);
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

  it("requires TECHNICIAN branch", () => {
    const error = validateUserCreateForm({
      ...baseForm,
      role: "TECHNICIAN",
      branchId: "",
      nationalId: "V12345678",
    });
    expect(error).toMatch(/sucursal/i);
    expect(resolveUserBranchId("TECHNICIAN", "12")).toBe(12);
  });

  it("rejects TECHNICIAN without branch", () => {
    const error = validateUserCreateForm({
      ...baseForm,
      role: "TECHNICIAN",
      branchId: "",
      nationalId: "V12345678",
    });
    expect(error).toMatch(/sucursal/i);
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
