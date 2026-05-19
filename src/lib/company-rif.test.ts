import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError } from "@/types/auth";
import {
  isDuplicateCompanyRifError,
  resolveCompanyIdForRif,
} from "./company-rif";

vi.mock("@/lib/companies-api", () => ({
  createCompany: vi.fn(),
  fetchCompanies: vi.fn(),
  resolveCompanyByRif: vi.fn(),
}));

import {
  createCompany,
  fetchCompanies,
  resolveCompanyByRif,
} from "@/lib/companies-api";

describe("isDuplicateCompanyRifError", () => {
  it("detects rif already exists message", () => {
    expect(
      isDuplicateCompanyRifError(
        new ApiError("rif already exists: J315694205", 400),
      ),
    ).toBe(true);
    expect(
      isDuplicateCompanyRifError(new ApiError("Conflict", 500)),
    ).toBe(false);
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

  it("refreshes catalog when RIF not in initial list but exists on server", async () => {
    vi.mocked(fetchCompanies).mockResolvedValue([
      {
        id: 55,
        rif: "J315694205",
        businessName: "Remota",
        contributorType: "ordinario",
        createdAt: "",
      },
    ]);

    const result = await resolveCompanyIdForRif(
      {
        rif: "J315694205",
        businessName: "ACME",
        contributorType: "ordinario",
      },
      [],
    );

    expect(result.companyId).toBe(55);
    expect(result.companyCreated).toBe(false);
    expect(createCompany).not.toHaveBeenCalled();
    expect(fetchCompanies).toHaveBeenCalledOnce();
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

  it("resolves company by RIF when absent from distributor-scoped list", async () => {
    vi.mocked(fetchCompanies).mockResolvedValue([]);
    vi.mocked(resolveCompanyByRif).mockResolvedValue({
      id: 77,
      rif: "J315694205",
      businessName: "Empresa existente",
      contributorType: "ordinario",
      createdAt: "",
    });

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
    expect(createCompany).not.toHaveBeenCalled();
    expect(resolveCompanyByRif).toHaveBeenCalledWith("J315694205");
  });

  it("on duplicate RIF from API, resolves via lookup and links existing", async () => {
    vi.mocked(fetchCompanies).mockResolvedValue([]);
    vi.mocked(resolveCompanyByRif)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 77,
        rif: "J315694205",
        businessName: "Empresa existente",
        contributorType: "ordinario",
        createdAt: "",
      });
    vi.mocked(createCompany).mockRejectedValue(
      new ApiError("rif already exists: J315694205", 400),
    );

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
    expect(createCompany).toHaveBeenCalledOnce();
    expect(resolveCompanyByRif).toHaveBeenCalledTimes(2);
  });
});
