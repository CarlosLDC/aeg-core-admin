import { describe, expect, it } from "vitest";
import { validateOnboardingSection } from "@/lib/distributor-onboarding-policy";

const baseForm = {
  rif: "J123456789",
  businessName: "Acme C.A.",
  linkedCompanyId: null,
  contributorType: "ordinario" as const,
  city: "Caracas",
  state: "Distrito Capital",
  address: "Av. Principal 123",
  contactPersonName: "",
};

describe("validateOnboardingSection", () => {
  it("requires contributor type when creating a new company", () => {
    expect(
      validateOnboardingSection("fiscal", {
        ...baseForm,
        contributorType: undefined as never,
      }),
    ).toBe("El tipo de contribuyente es obligatorio.");
  });

  it("requires contributor type when editing an existing company", () => {
    expect(
      validateOnboardingSection("fiscal", {
        ...baseForm,
        contributorType: undefined as never,
        linkedCompanyId: 42,
      }),
    ).toBe("El tipo de contribuyente es obligatorio.");
  });

  it("requires valid RIF and business name when lockCompanyFields is false even if linkedCompanyId is set", () => {
    expect(
      validateOnboardingSection(
        "fiscal",
        {
          ...baseForm,
          rif: "invalid",
          linkedCompanyId: 42,
        },
        { lockCompanyFields: false },
      ),
    ).toBe("Formato: letra V, E, J, P o G seguida de guion y 7 a 9 dígitos.");

    expect(
      validateOnboardingSection(
        "fiscal",
        {
          ...baseForm,
          businessName: "   ",
          linkedCompanyId: 42,
        },
        { lockCompanyFields: false },
      ),
    ).toBe("Indica la razón social de la empresa.");
  });

  it("requires address when creating a branch", () => {
    expect(
      validateOnboardingSection("location", {
        ...baseForm,
        address: "   ",
      }),
    ).toBe("La dirección es obligatoria.");
  });

  it("requires address when editing a branch", () => {
    expect(
      validateOnboardingSection("location", {
        ...baseForm,
        address: "",
      }),
    ).toBe("La dirección es obligatoria.");
  });
});
