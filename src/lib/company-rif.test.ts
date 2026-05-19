import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError } from "@/types/auth";
import {
  isDuplicateCompanyRifError,
  resolveCompanyIdForRif,
} from "./company-rif";

vi.mock("@/lib/companies-api", () => ({
  createCompany: vi.fn(),
  fetchCompanies: vi.fn(),
}));

import { createCompany, fetchCompanies } from "@/lib/companies-api";

describe("isDuplicateCompanyRifError", () => {
  it("detects rif already exists message", () => {
    expect(
      isDuplicateCompanyRifError(
        new ApiError("rif already exists: J315694205", 400),
      ),
    ).toBe(true);
  });

  it("detects 409 conflict", () => {
    expect(isDuplicateCompanyRifError(new ApiError("Conflict", 409))).toBe(
      true,
    );
  });
});

describe("resolveCompanyIdForRif", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reuses company from local list without calling API", async () => {
    const result = await resolveCompanyIdForRif(
      {
        rif: "J315694205",
        businessName: "ACME",
        contributorType: "ordinario",
      },
      [
        {
          id: 99,
          rif: "J315694205",
          businessName: "ACME",
          contributorType: "ordinario",
          createdAt: "",
        },
      ],
    );

    expect(result).toEqual({ companyId: 99, companyCreated: false });
    expect(createCompany).not.toHaveBeenCalled();
  });

  it("on duplicate RIF from API, fetches companies and links existing", async () => {
    vi.mocked(createCompany).mockRejectedValue(
      new ApiError("rif already exists: J315694205", 400),
    );
    vi.mocked(fetchCompanies).mockResolvedValue([
      {
        id: 77,
        rif: "J315694205",
        businessName: "Empresa existente",
        contributorType: "ordinario",
        createdAt: "",
      },
    ]);

    const result = await resolveCompanyIdForRif(
      {
        rif: "J315694205",
        businessName: "Nuevo nombre",
        contributorType: "ordinario",
      },
      [],
    );

    expect(result.companyId).toBe(77);
    expect(result.companyCreated).toBe(false);
    expect(result.companies).toHaveLength(1);
    expect(createCompany).toHaveBeenCalledOnce();
    expect(fetchCompanies).toHaveBeenCalledOnce();
  });
});
