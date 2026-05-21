import { describe, expect, it } from "vitest";
import { branchFormSchema } from "@/lib/schemas/branch-form-schema";

describe("branchFormSchema", () => {
  it("requires contactPersonName", () => {
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
    });
    expect(result.success).toBe(false);
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
    });
    expect(result.success).toBe(true);
  });
});
