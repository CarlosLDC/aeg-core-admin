import { describe, expect, it } from "vitest";
import { onboardingMatchesCatalog } from "@/lib/client-catalog-match";

const company = {
  id: 1,
  businessName: "ACME",
  rif: "J123456789",
  contributorType: "ordinario" as const,
  createdAt: "",
};

const branch = {
  id: 10,
  companyId: 1,
  city: "Caracas",
  state: "Miranda",
  address: "Av 1",
  contactPersonName: "Ana",
  phone: "0412",
  email: "a@test.com",
  createdAt: "",
};

const values = {
  rif: "J123456789",
  businessName: "ACME",
  contributorType: "ordinario" as const,
  linkedCompanyId: null,
  city: "Caracas",
  state: "Miranda",
  address: "Av 1",
  contactPersonName: "Ana",
  phone: "0412",
  email: "a@test.com",
};

describe("onboardingMatchesCatalog", () => {
  it("coincide cuando empresa y sucursal reflejan el formulario", () => {
    expect(onboardingMatchesCatalog(company, branch, values)).toBe(true);
  });

  it("no coincide cuando cambia la razón social", () => {
    expect(
      onboardingMatchesCatalog(company, branch, {
        ...values,
        businessName: "Nueva razón social",
      }),
    ).toBe(false);
  });
});
