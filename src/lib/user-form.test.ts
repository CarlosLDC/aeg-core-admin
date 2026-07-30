import { describe, expect, it } from "vitest";
import {
  normalizeNationalId,
  resolveUserBranchId,
  resolveUserDistributorId,
  resolveUserNationalId,
  validateUserCreateForm,
  validateUserEditForm,
  validateUserWizardStep,
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

  it("requires ADMIN national id", () => {
    const error = validateUserCreateForm({
      ...baseForm,
      role: "ADMIN",
      nationalId: "",
    });
    expect(error).toMatch(/cédula/i);
  });

  it("accepts ADMIN with national id", () => {
    const error = validateUserCreateForm({
      ...baseForm,
      role: "ADMIN",
      nationalId: "V12345678",
    });
    expect(error).toBeNull();
    expect(resolveUserNationalId("ADMIN", "V12345678")).toBe("V12345678");
    expect(resolveUserDistributorId("ADMIN", "")).toBeNull();
  });
});

describe("validateUserEditForm", () => {
  it("requires ADMIN national id on edit", () => {
    const error = validateUserEditForm({
      ...baseForm,
      role: "ADMIN",
      password: "",
      nationalId: "",
    });
    expect(error).toMatch(/cédula/i);
  });

  it("accepts ADMIN with national id on edit", () => {
    const error = validateUserEditForm({
      ...baseForm,
      role: "ADMIN",
      password: "",
      nationalId: "V12345678",
    });
    expect(error).toBeNull();
  });
});

describe("validateUserWizardStep", () => {
  it("validates identity before advancing", () => {
    expect(
      validateUserWizardStep(
        "identity",
        { ...baseForm, name: "", role: "SENIAT" },
        "create",
      ),
    ).toMatch(/nombre/i);
    expect(
      validateUserWizardStep(
        "identity",
        { ...baseForm, role: "SENIAT" },
        "create",
      ),
    ).toBeNull();
  });

  it("skips role validation and checks assignment on last step", () => {
    expect(
      validateUserWizardStep(
        "role",
        { ...baseForm, role: "ADMIN", nationalId: "" },
        "create",
      ),
    ).toBeNull();
    expect(
      validateUserWizardStep(
        "assignment",
        { ...baseForm, role: "ADMIN", nationalId: "" },
        "create",
      ),
    ).toMatch(/cédula/i);
  });
});

describe("normalizeNationalId", () => {
  it("strips whitespace", () => {
    expect(normalizeNationalId(" V 12 345 678 ")).toBe("V12345678");
  });
});
