import { describe, expect, it } from "vitest";
import { branchFormSchema } from "@/lib/schemas/branch-form-schema";

describe("branchFormSchema", () => {
  it("accepts empty contactPersonName", () => {
    const result = branchFormSchema.safeParse({
      companyId: "1",
      city: "Caracas",
      state: "Distrito Capital",
      address: "",
      contactPersonName: "",
      phone: "",
      email: "",
      isClient: false,
      isDistributor: false,
      isServiceCenter: false,
      clientDistributorId: "",
      isHeadquarters: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid branch payload", () => {
    const result = branchFormSchema.safeParse({
      companyId: "1",
      city: "Caracas",
      state: "Distrito Capital",
      address: "Av. 1",
      contactPersonName: "María Pérez",
      phone: "04121234567",
      email: "sucursal@aeg.local",
      isClient: true,
      isDistributor: false,
      isServiceCenter: false,
      clientDistributorId: "5",
      isHeadquarters: true,
    });
    expect(result.success).toBe(true);
  });
});
