import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidFiscalSearchQuery } from "@/lib/fiscal-book/map-fiscal-printer";
import { searchFiscalPrinters } from "@/lib/fiscal-book/search-fiscal-printers";
import { fetchPrinters } from "@/lib/printers-api";

vi.mock("@/lib/printers-api", () => ({
  fetchPrinters: vi.fn(),
}));

vi.mock("@/lib/companies-api", () => ({
  fetchCompanies: vi.fn().mockResolvedValue([
    {
      id: 1,
      businessName: "Empresa Demo",
      rif: "J123456789",
      contributorType: "ordinario",
      createdAt: "2024-01-01T00:00:00Z",
    },
  ]),
  resolveCompanyByRif: vi.fn(),
}));

vi.mock("@/lib/branches-api", () => ({
  fetchBranches: vi.fn().mockResolvedValue([
    {
      id: 10,
      companyId: 1,
      city: "Caracas",
      state: "DC",
      address: "",
      phone: "",
      email: "",
      createdAt: "2024-01-01T00:00:00Z",
    },
  ]),
}));

vi.mock("@/lib/clients-api", () => ({
  fetchClients: vi.fn().mockResolvedValue([
    {
      id: 100,
      branchId: 10,
      createdAt: "2024-01-01T00:00:00Z",
      reviewStatus: "ACTIVE",
    },
    {
      id: 101,
      branchId: 99,
      createdAt: "2024-01-01T00:00:00Z",
      reviewStatus: "ACTIVE",
    },
  ]),
}));

vi.mock("@/lib/distributors-api", () => ({
  fetchDistributors: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/printer-models-api", () => ({
  fetchPrinterModels: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/software-api", () => ({
  fetchSoftware: vi.fn().mockResolvedValue([]),
}));

describe("isValidFiscalSearchQuery", () => {
  it("accepts valid fiscal serials", () => {
    expect(isValidFiscalSearchQuery("GRA0000123", "serial")).toBe(true);
    expect(isValidFiscalSearchQuery("gra0000123", "serial")).toBe(true);
  });

  it("rejects invalid serial formats", () => {
    expect(isValidFiscalSearchQuery("GRA123", "serial")).toBe(false);
    expect(isValidFiscalSearchQuery("", "serial")).toBe(false);
  });

  it("accepts valid RIF values", () => {
    expect(isValidFiscalSearchQuery("J123456789", "rif")).toBe(true);
    expect(isValidFiscalSearchQuery("v12345678", "rif")).toBe(true);
  });

  it("rejects invalid RIF formats", () => {
    expect(isValidFiscalSearchQuery("X12345678", "rif")).toBe(false);
    expect(isValidFiscalSearchQuery("J123", "rif")).toBe(false);
  });
});

describe("searchFiscalPrinters", () => {
  beforeEach(() => {
    vi.mocked(fetchPrinters).mockResolvedValue([
      {
        id: 1,
        modelId: 1,
        softwareId: null,
        clientId: 100,
        fiscalSerial: "GRA0000123",
        finalSalePrice: null,
        createdAt: "2024-01-01T00:00:00Z",
        status: "enajenada",
        distributorId: null,
        paid: true,
        installationDate: null,
        versionFirmware: null,
        macAddress: null,
        deviceType: "interno",
      },
      {
        id: 2,
        modelId: 1,
        softwareId: null,
        clientId: 101,
        fiscalSerial: "GRA0000456",
        finalSalePrice: null,
        createdAt: "2024-01-01T00:00:00Z",
        status: "enajenada",
        distributorId: null,
        paid: true,
        installationDate: null,
        versionFirmware: null,
        macAddress: null,
        deviceType: "interno",
      },
    ]);
  });

  it("returns empty result for invalid query", async () => {
    const result = await searchFiscalPrinters("BAD", "serial", 1, 10, {
      role: "ADMIN",
      scope: null,
      distributorId: null,
    });
    expect(result).toEqual({ data: [], count: 0 });
    expect(fetchPrinters).not.toHaveBeenCalled();
  });

  it("filters by exact fiscal serial", async () => {
    const result = await searchFiscalPrinters("GRA0000123", "serial", 1, 10, {
      role: "ADMIN",
      scope: null,
      distributorId: null,
    });
    expect(result.count).toBe(1);
    expect(result.data[0]?.fiscalSerial).toBe("GRA0000123");
  });

  it("filters by RIF through company branches and clients", async () => {
    const result = await searchFiscalPrinters("J123456789", "rif", 1, 10, {
      role: "ADMIN",
      scope: null,
      distributorId: null,
    });
    expect(result.count).toBe(1);
    expect(result.data[0]?.id).toBe("1");
  });
});
