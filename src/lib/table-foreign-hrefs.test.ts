import { describe, expect, it } from "vitest";
import { hrefForClient, hrefForCompany } from "@/lib/table-foreign-hrefs";
import type { ClientResponse } from "@/types/branch-role";

const client: ClientResponse = {
  id: 10,
  branchId: 99,
  distributorId: 1,
  companyBusinessName: null,
  companyRif: null,
  branchCity: null,
  branchState: null,
  branchPhone: null,
  branchEmail: null,
  createdAt: "2024-01-01T00:00:00Z",
  reviewStatus: "ACTIVE",
  activeModificationRequestId: null,
};

describe("hrefForClient", () => {
  it("does not link service center technicians to panel client routes", () => {
    expect(hrefForClient(10, [client], "TECHNICIAN")).toBeUndefined();
  });

  it("links ADMIN to branch detail when client route is denied", () => {
    expect(hrefForClient(10, [client], "ADMIN")).toBe("/branches/99");
  });
});

describe("hrefForCompany", () => {
  it("links ADMIN to company detail and hides link for TECHNICIAN or null id", () => {
    expect(hrefForCompany(42, "ADMIN")).toBe("/companies/42");
    expect(hrefForCompany(42, "TECHNICIAN")).toBeUndefined();
    expect(hrefForCompany(null, "ADMIN")).toBeUndefined();
  });
});
