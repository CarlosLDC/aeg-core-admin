import { describe, expect, it } from "vitest";
import {
  clientRif,
  clientSearchText,
  distributorRif,
  distributorSearchText,
  serviceCenterRif,
  serviceCenterSearchText,
} from "@/lib/branch-roles";
import {
  distributorSelectOptions,
  serviceCenterSelectOptions,
} from "@/lib/field-operations-catalog";
import type { BranchResponse } from "@/types/branch";
import type {
  ClientResponse,
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";

const mockCompanies: CompanyResponse[] = [
  {
    id: 10,
    businessName: "Distribuidora Los Andes C.A.",
    rif: "J-12345678-9",
    contributorType: "ordinario",
    createdAt: "2026-01-01",
  },
  {
    id: 20,
    businessName: "Centro Técnico Oriente C.A.",
    rif: "J-98765432-1",
    contributorType: "especial",
    createdAt: "2026-01-01",
  },
  {
    id: 30,
    businessName: "Supermercado El Éxito C.A.",
    rif: "J-55555555-5",
    contributorType: "ordinario",
    createdAt: "2026-01-01",
  },
];

const mockBranches: BranchResponse[] = [
  {
    id: 101,
    companyId: 10,
    city: "Mérida",
    state: "Mérida",
    address: "Av. 3",
    phone: "0274-1234567",
    email: "andes@test.com",
    createdAt: "2026-01-01",
    organizationRole: "DISTRIBUTOR",
  },
  {
    id: 201,
    companyId: 20,
    city: "Puerto La Cruz",
    state: "Anzoátegui",
    address: "Calle Bolívar",
    phone: "0281-1234567",
    email: "oriente@test.com",
    createdAt: "2026-01-01",
    organizationRole: "SERVICE_CENTER",
  },
  {
    id: 301,
    companyId: 30,
    city: "Caracas",
    state: "Distrito Capital",
    address: "Chacao",
    phone: "0212-1234567",
    email: "exito@test.com",
    createdAt: "2026-01-01",
    organizationRole: "NONE",
  },
];

const mockDistributor: DistributorResponse = {
  id: 1,
  branchId: 101,
  createdAt: "2026-01-01",
};

const mockServiceCenter: ServiceCenterResponse = {
  id: 2,
  branchId: 201,
  createdAt: "2026-01-01",
};

const mockClient: ClientResponse = {
  id: 3,
  branchId: 301,
  reviewStatus: "ACTIVE",
  createdAt: "2026-01-01",
  companyRif: "J-55555555-5",
};

describe("branch-roles RIF helpers", () => {
  it("resolves distributor RIF and searchText", () => {
    expect(distributorRif(mockDistributor, mockBranches, mockCompanies)).toBe(
      "J-12345678-9",
    );
    const search = distributorSearchText(
      mockDistributor,
      mockBranches,
      mockCompanies,
    );
    expect(search).toContain("J-12345678-9");
    expect(search).toContain("Distribuidora Los Andes");
  });

  it("resolves service center RIF and searchText", () => {
    expect(
      serviceCenterRif(mockServiceCenter, mockBranches, mockCompanies),
    ).toBe("J-98765432-1");
    const search = serviceCenterSearchText(
      mockServiceCenter,
      mockBranches,
      mockCompanies,
    );
    expect(search).toContain("J-98765432-1");
    expect(search).toContain("Centro Técnico Oriente");
  });

  it("resolves client RIF and searchText", () => {
    expect(clientRif(mockClient, mockBranches, mockCompanies)).toBe(
      "J-55555555-5",
    );
    const search = clientSearchText(mockClient, mockBranches, mockCompanies);
    expect(search).toContain("J-55555555-5");
    expect(search).toContain("Supermercado El Éxito");
  });
});

describe("field-operations-catalog RIF options", () => {
  it("includes RIF in serviceCenterSelectOptions", () => {
    const options = serviceCenterSelectOptions(
      [mockServiceCenter],
      mockBranches,
      mockCompanies,
    );
    expect(options[0]?.description).toBe("RIF: J-98765432-1");
    expect(options[0]?.searchText).toContain("J-98765432-1");
  });

  it("includes RIF in distributorSelectOptions", () => {
    const options = distributorSelectOptions(
      [mockDistributor],
      mockBranches,
      mockCompanies,
    );
    expect(options[0]?.description).toBe("RIF: J-12345678-9");
    expect(options[0]?.searchText).toContain("J-12345678-9");
  });
});
