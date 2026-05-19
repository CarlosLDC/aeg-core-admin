import { describe, expect, it } from "vitest";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import {
  branchesStatHint,
  companiesStatHint,
  uniquePlaces,
} from "./dashboard-data";

const companies: CompanyResponse[] = [
  {
    id: 1,
    businessName: "A",
    rif: "J-1",
    contributorType: "ordinario",
    createdAt: "2024-01-01",
  },
  {
    id: 2,
    businessName: "B",
    rif: "J-2",
    contributorType: "especial",
    createdAt: "2024-01-01",
  },
];

const branches: BranchResponse[] = [
  {
    id: 10,
    companyId: 1,
    city: "Caracas",
    state: "Miranda",
    address: "",
    phone: "",
    email: "",
    createdAt: "2024-01-01",
  },
  {
    id: 11,
    companyId: 1,
    city: "Valencia",
    state: "Carabobo",
    address: "",
    phone: "",
    email: "",
    createdAt: "2024-01-02",
  },
];

describe("companiesStatHint", () => {
  it("counts companies with and without branches", () => {
    expect(companiesStatHint(companies, branches)).toBe(
      "1 con sucursales · 1 sin sucursal",
    );
  });
});

describe("branchesStatHint", () => {
  it("lists network roles on branches", () => {
    expect(
      branchesStatHint(branches, {
        clients: 3,
        distributors: 2,
        serviceCenters: 1,
      }),
    ).toBe("3 clientes · 2 distribuidoras · 1 centro");
  });
});

describe("uniquePlaces", () => {
  it("counts distinct states and cities", () => {
    expect(uniquePlaces(branches)).toBe("2 estados · 2 ciudades");
  });
});
