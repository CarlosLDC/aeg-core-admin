import { describe, expect, it } from "vitest";
import { companyFormSchema } from "@/lib/schemas/company-form-schema";

describe("companyFormSchema", () => {
  it("accepts valid RIF and normalizes with hyphen", () => {
    const withHyphen = companyFormSchema.safeParse({
      businessName: "Acme C.A.",
      rif: "J-123456789",
      contributorType: "ordinario",
    });
    expect(withHyphen.success).toBe(true);
    if (withHyphen.success) {
      expect(withHyphen.data.rif).toBe("J-123456789");
    }

    const withoutHyphen = companyFormSchema.safeParse({
      businessName: "Acme C.A.",
      rif: "J123456789",
      contributorType: "ordinario",
    });
    expect(withoutHyphen.success).toBe(true);
    if (withoutHyphen.success) {
      expect(withoutHyphen.data.rif).toBe("J-123456789");
    }
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
