import { describe, expect, it } from "vitest";
import {
  collectAiFilledFields,
  isFieldLockedByAi,
} from "./seniat-ai-fields";

describe("seniat-ai-fields", () => {
  it("locks fields filled by IA in ai mode", () => {
    const aiFields = collectAiFilledFields({
      rif: "J123456789",
      businessName: "ACME",
      contributorType: "ordinario",
      state: "Miranda",
      city: "Caracas",
      address: "Av 1",
      phone: null,
      email: null,
    });
    expect(isFieldLockedByAi("rif", "ai", aiFields)).toBe(true);
    expect(isFieldLockedByAi("businessName", "ai", aiFields)).toBe(true);
    expect(isFieldLockedByAi("rif", "manual", aiFields)).toBe(false);
  });

  it("does not lock phone or email via lockable fields", () => {
    const aiFields = collectAiFilledFields({
      rif: "J123456789",
      businessName: "ACME",
      contributorType: null,
      state: "",
      city: "",
      address: "",
      phone: "0412",
      email: "a@b.com",
    });
    expect(aiFields.has("rif")).toBe(true);
    expect([...aiFields]).not.toContain("phone");
  });
});
