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
      validateOnboardingSection(
        "fiscal",
        { ...baseForm, contributorType: undefined as never },
        { requireContributorType: true },
      ),
    ).toBe("El tipo de contribuyente es obligatorio.");
  });

  it("allows missing contributor type when editing legacy records", () => {
    expect(
      validateOnboardingSection(
        "fiscal",
        { ...baseForm, contributorType: undefined as never },
        { requireContributorType: false },
      ),
    ).toBeNull();
  });

  it("requires address when creating a branch", () => {
    expect(
      validateOnboardingSection(
        "location",
        { ...baseForm, address: "   " },
        { requireAddress: true },
      ),
    ).toBe("La dirección es obligatoria.");
  });

  it("allows empty address when editing legacy records", () => {
    expect(
      validateOnboardingSection(
        "location",
        { ...baseForm, address: "" },
        { requireAddress: false },
      ),
    ).toBeNull();
  });
});
