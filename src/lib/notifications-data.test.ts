import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadNotifications, notificationKindLabel } from "./notifications-data";
import type { CompanyResponse } from "@/types/company";
import type { BranchResponse } from "@/types/branch";

vi.mock("@/lib/companies-api", () => ({
  fetchCompanies: vi.fn(),
}));

vi.mock("@/lib/branches-api", () => ({
  fetchBranches: vi.fn(),
}));

vi.mock("@/lib/clients-api", () => ({
  fetchClients: vi.fn(),
}));

vi.mock("@/lib/users-api", () => ({
  fetchUsers: vi.fn(),
}));

vi.mock("@/lib/printers-api", () => ({
  fetchPrinters: vi.fn(),
}));

vi.mock("@/lib/seals-api", () => ({
  fetchSeals: vi.fn(),
}));

vi.mock("@/lib/technical-services-api", () => ({
  fetchTechnicalServices: vi.fn(),
}));

vi.mock("@/lib/annual-inspections-api", () => ({
  fetchAnnualInspections: vi.fn(),
}));

vi.mock("@/lib/printer-models-api", () => ({
  fetchPrinterModels: vi.fn(),
}));

vi.mock("@/lib/distributor-contracts-api", () => ({
  fetchDistributorContracts: vi.fn(),
}));

vi.mock("@/lib/service-center-contracts-api", () => ({
  fetchServiceCenterContracts: vi.fn(),
}));

import { fetchCompanies } from "@/lib/companies-api";
import { fetchBranches } from "@/lib/branches-api";
import { fetchPrinters } from "@/lib/printers-api";
import { fetchUsers } from "@/lib/users-api";
import { fetchSeals } from "@/lib/seals-api";
import { fetchTechnicalServices } from "@/lib/technical-services-api";
import { fetchAnnualInspections } from "@/lib/annual-inspections-api";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import { fetchDistributorContracts } from "@/lib/distributor-contracts-api";
import { fetchServiceCenterContracts } from "@/lib/service-center-contracts-api";

describe("notificationKindLabel", () => {
  it("labels company as Empresa and branch as Sucursal", () => {
    expect(notificationKindLabel("company")).toBe("Empresa");
    expect(notificationKindLabel("branch")).toBe("Sucursal");
  });
});

describe("loadNotifications - company vs branch distinction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchUsers).mockResolvedValue([]);
    vi.mocked(fetchPrinters).mockResolvedValue([]);
    vi.mocked(fetchSeals).mockResolvedValue([]);
    vi.mocked(fetchTechnicalServices).mockResolvedValue([]);
    vi.mocked(fetchAnnualInspections).mockResolvedValue([]);
    vi.mocked(fetchPrinterModels).mockResolvedValue([]);
    vi.mocked(fetchDistributorContracts).mockResolvedValue([]);
    vi.mocked(fetchServiceCenterContracts).mockResolvedValue([]);
  });

  it("distinguishes company creation from branch creation visually and semantically", async () => {
    const recentDate = new Date().toISOString();
    const mockCompanies: CompanyResponse[] = [
      {
        id: 10,
        businessName: "Acme Corp",
        rif: "J-12345678-9",
        contributorType: "ordinario",
        createdAt: recentDate,
      },
    ];

    const mockBranches: BranchResponse[] = [
      {
        id: 20,
        companyId: 10,
        city: "Caracas",
        state: "Distrito Capital",
        address: "Av Principal",
        phone: "02120000000",
        email: "caracas@acme.com",
        createdAt: recentDate,
      },
    ];

    vi.mocked(fetchCompanies).mockResolvedValue(mockCompanies);
    vi.mocked(fetchBranches).mockResolvedValue(mockBranches);

    const result = await loadNotifications({
      role: "ADMIN",
      username: "admin",
      scope: null,
      distributorId: null,
      userBranchId: null,
    });

    const companyNotif = result.notifications.find((n) => n.id === "company-10");
    const branchNotif = result.notifications.find((n) => n.id === "branch-20");

    expect(companyNotif).toBeDefined();
    expect(companyNotif?.kind).toBe("company");
    expect(companyNotif?.title).toBe("Nueva empresa");
    expect(companyNotif?.message).toBe("Acme Corp (J-12345678-9) añadida al catálogo.");

    expect(branchNotif).toBeDefined();
    expect(branchNotif?.kind).toBe("branch");
    expect(branchNotif?.title).toBe("Nueva sucursal");
    expect(branchNotif?.message).toBe(
      "Sucursal de Acme Corp registrada en Caracas, Distrito Capital.",
    );
  });
});
