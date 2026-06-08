import { describe, expect, it } from "vitest";
import {
  resolveFiscalBookEmployeeId,
  validateFiscalBookUserCreateForm,
  validateFiscalBookUserEditForm,
} from "@/lib/fiscal-book-user-form";

const base = {
  name: "Auditor",
  email: "auditor@aeg.local",
  password: "secret1",
  role: "FISCAL_AUDITOR" as const,
  employeeId: "",
  enabled: true,
};

describe("validateFiscalBookUserCreateForm", () => {
  it("accepts auditor without employee", () => {
    expect(validateFiscalBookUserCreateForm(base)).toBeNull();
  });

  it("requires employee for technician", () => {
    expect(
      validateFiscalBookUserCreateForm({
        ...base,
        role: "FISCAL_TECHNICIAN",
      }),
    ).toMatch(/empleado/i);
  });
});

describe("resolveFiscalBookEmployeeId", () => {
  it("returns null for non-technician roles", () => {
    expect(resolveFiscalBookEmployeeId("FISCAL_AUDITOR", "12")).toBeNull();
  });

  it("parses employee id for technician", () => {
    expect(resolveFiscalBookEmployeeId("FISCAL_TECHNICIAN", "42")).toBe(42);
  });
});

describe("validateFiscalBookUserEditForm", () => {
  it("allows empty password on edit", () => {
    expect(
      validateFiscalBookUserEditForm({
        ...base,
        password: "",
      }),
    ).toBeNull();
  });
});
