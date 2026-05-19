import { describe, expect, it } from "vitest";
import { companyFormSchema } from "@/lib/schemas/company-form-schema";

describe("companyFormSchema", () => {
  it("accepts valid RIF", () => {
    const result = companyFormSchema.safeParse({
      businessName: "Acme C.A.",
      rif: "J123456789",
      contributorType: "ordinario",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid RIF", () => {
    const result = companyFormSchema.safeParse({
      businessName: "Acme",
      rif: "INVALID",
      contributorType: "ordinario",
    });
    expect(result.success).toBe(false);
  });
});
