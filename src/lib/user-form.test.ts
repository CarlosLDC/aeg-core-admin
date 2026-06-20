import { describe, expect, it } from "vitest";
import {
  normalizeNationalId,
  resolveUserDistributorId,
  resolveUserNationalId,
  validateUserCreateForm,
  validateUserEditForm,
} from "@/lib/user-form";

describe("validateUserCreateForm", () => {
  it("accepts TECHNICIAN with distributor and national id", () => {
    const error = validateUserCreateForm({
      name: "Usuario Técnico",
      email: "tech@aeg.local",
      password: "secret1",
      role: "TECHNICIAN",
      distributorId: "7",
      nationalId: "V12345678",
    });
    expect(error).toBeNull();
    expect(resolveUserDistributorId("TECHNICIAN", "7")).toBe(7);
    expect(resolveUserNationalId("TECHNICIAN", "V12345678")).toBe("V12345678");
  });

  it("rejects TECHNICIAN without distributor", () => {
    const error = validateUserCreateForm({
      name: "Usuario Técnico",
      email: "tech@aeg.local",
      password: "secret1",
      role: "TECHNICIAN",
      distributorId: "",
      nationalId: "V12345678",
    });
    expect(error).toMatch(/distribuidora/i);
  });

  it("rejects TECHNICIAN without national id", () => {
    const error = validateUserCreateForm({
      name: "Usuario Técnico",
      email: "tech@aeg.local",
      password: "secret1",
      role: "TECHNICIAN",
      distributorId: "7",
      nationalId: "",
    });
    expect(error).toMatch(/cédula/i);
  });

  it("accepts ADMIN without distributor or national id", () => {
    const error = validateUserCreateForm({
      name: "Administrador",
      email: "admin@aeg.local",
      password: "secret1",
      role: "ADMIN",
      distributorId: "",
      nationalId: "",
    });
    expect(error).toBeNull();
    expect(resolveUserDistributorId("ADMIN", "")).toBeNull();
  });

  it("accepts SENIAT without distributor or national id", () => {
    const error = validateUserCreateForm({
      name: "Auditor SENIAT",
      email: "seniat@aeg.local",
      password: "secret1",
      role: "SENIAT",
      distributorId: "",
      nationalId: "",
    });
    expect(error).toBeNull();
  });
});

describe("validateUserEditForm", () => {
  it("accepts ADMIN without distributor or national id", () => {
    const error = validateUserEditForm({
      name: "Administrador",
      email: "admin@aeg.local",
      password: "",
      role: "ADMIN",
      distributorId: "",
      nationalId: "",
    });
    expect(error).toBeNull();
  });
});

describe("normalizeNationalId", () => {
  it("strips whitespace", () => {
    expect(normalizeNationalId(" V 12 345 678 ")).toBe("V12345678");
  });
});
