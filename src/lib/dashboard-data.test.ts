import { describe, expect, it } from "vitest";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import {
  branchesStatHint,
  companiesStatHint,
  countPrintersByStatus,
  distributorSalesByMonth,
  uniquePlaces,
} from "./dashboard-data";
import type { PrinterResponse } from "@/types/printer";

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
      "1 activas en red · 1 pendientes de alta",
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

describe("distributorSalesByMonth", () => {
  it("counts enajenadas by installation date within the window", () => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const printers = [
      {
        status: "enajenada",
        installationDate: now.toISOString(),
        createdAt: "2020-01-01",
        finalSalePrice: 100,
      },
      {
        status: "asignada",
        installationDate: now.toISOString(),
        createdAt: now.toISOString(),
        finalSalePrice: 50,
      },
    ] as PrinterResponse[];

    const rows = distributorSalesByMonth(printers, 12);
    const current = rows.find((row) => row.key === key);
    expect(current?.count).toBe(1);
    expect(current?.revenue).toBe(100);
  });
});

describe("countPrintersByStatus", () => {
  const printers = [
    { status: "sin_asignar" },
    { status: "asignada" },
    { status: "enajenada" },
  ] as PrinterResponse[];

  it("includes all statuses for admin", () => {
    expect(countPrintersByStatus(printers, "ADMIN")).toHaveLength(6);
  });

  it("only includes asignada and enajenada for distributor", () => {
    const rows = countPrintersByStatus(printers, "DISTRIBUTOR");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.status)).toEqual(["asignada", "enajenada"]);
    expect(rows.find((r) => r.status === "asignada")?.count).toBe(1);
    expect(rows.find((r) => r.status === "enajenada")?.count).toBe(1);
  });
});
