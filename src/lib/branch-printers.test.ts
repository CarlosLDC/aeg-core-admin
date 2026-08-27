import { describe, expect, it } from "vitest";
import {
  filterPrintersByQuickFilter,
  filterPrintersForBranch,
  getBranchPrinterStats,
} from "@/lib/branch-printers";
import type { BranchWithRoles } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { PrinterResponse } from "@/types/printer";

function mockPrinter(overrides: Partial<PrinterResponse>): PrinterResponse {
  return {
    id: 1,
    modelId: 1,
    softwareId: null,
    clientId: null,
    fiscalSerial: "ABC100",
    finalSalePrice: null,
    createdAt: "2026-01-01T00:00:00Z",
    status: "asignada",
    distributorId: null,
    paid: true,
    installationDate: "2026-01-02T00:00:00Z",
    versionFirmware: "1.0",
    macAddress: "AA:BB:CC:DD:EE:FF",
    deviceType: "interno",
    header: null,
    trailer: null,
    ...overrides,
  };
}

describe("filterPrintersForBranch", () => {
  it("filters printers associated with a branch via client role", () => {
    const branch: BranchWithRoles = {
      id: 10,
      companyId: 1,
      city: "Caracas",
      state: "Distrito Capital",
      address: "Av. Principal",
      phone: "02120000000",
      email: "info@empresa.com",
      createdAt: "2026-01-01T00:00:00Z",
      client: {
        id: 100,
        branchId: 10,
        createdAt: "2026-01-01T00:00:00Z",
        reviewStatus: "ACTIVE",
      },
    };

    const printers: PrinterResponse[] = [
      mockPrinter({ id: 1, fiscalSerial: "SER1", clientId: 100 }),
      mockPrinter({ id: 2, fiscalSerial: "SER2", clientId: 100, status: "enajenada" }),
      mockPrinter({ id: 3, fiscalSerial: "SER3", clientId: 200 }),
    ];

    const result = filterPrintersForBranch(printers, branch);
    expect(result.map((p) => p.fiscalSerial)).toEqual(["SER1", "SER2"]);
  });

  it("filters printers associated with a branch via client parameter and clients array", () => {
    const branch: BranchWithRoles = {
      id: 10,
      companyId: 1,
      city: "Caracas",
      state: "Distrito Capital",
      address: "Av. Principal",
      phone: "02120000000",
      email: "info@empresa.com",
      createdAt: "2026-01-01T00:00:00Z",
    };

    const client: ClientResponse = {
      id: 100,
      branchId: 10,
      createdAt: "2026-01-01T00:00:00Z",
      reviewStatus: "ACTIVE",
    };

    const clients: ClientResponse[] = [
      client,
      {
        id: 105,
        branchId: 10,
        createdAt: "2026-01-01T00:00:00Z",
        reviewStatus: "ACTIVE",
      },
    ];

    const printers: PrinterResponse[] = [
      mockPrinter({ id: 1, fiscalSerial: "SER1", clientId: 100 }),
      mockPrinter({ id: 2, fiscalSerial: "SER2", clientId: 105 }),
      mockPrinter({ id: 3, fiscalSerial: "SER3", clientId: 999 }),
    ];

    const result = filterPrintersForBranch(printers, branch, client, clients);
    expect(result.map((p) => p.fiscalSerial)).toEqual(["SER1", "SER2"]);
  });

  it("filters printers associated with a branch via distributor role", () => {
    const branch: BranchWithRoles = {
      id: 20,
      companyId: 2,
      city: "Valencia",
      state: "Carabobo",
      address: "Zona Industrial",
      phone: "02410000000",
      email: "dist@empresa.com",
      createdAt: "2026-01-01T00:00:00Z",
      distributor: {
        id: 50,
        branchId: 20,
        createdAt: "2026-01-01T00:00:00Z",
      },
    };

    const printers: PrinterResponse[] = [
      mockPrinter({ id: 1, fiscalSerial: "D1", distributorId: 50 }),
      mockPrinter({ id: 2, fiscalSerial: "D2", distributorId: 50, status: "enajenada" }),
      mockPrinter({ id: 3, fiscalSerial: "D3", distributorId: 99 }),
    ];

    const result = filterPrintersForBranch(printers, branch);
    expect(result.map((p) => p.fiscalSerial)).toEqual(["D1", "D2"]);
  });

  it("returns empty array when branch has no client or distributor roles", () => {
    const branch: BranchWithRoles = {
      id: 30,
      companyId: 3,
      city: "Maracaibo",
      state: "Zulia",
      address: "Calle 72",
      phone: "02610000000",
      email: "sucursal@empresa.com",
      createdAt: "2026-01-01T00:00:00Z",
    };

    const printers: PrinterResponse[] = [
      mockPrinter({ id: 1, fiscalSerial: "P1", clientId: 1 }),
      mockPrinter({ id: 2, fiscalSerial: "P2", distributorId: 1 }),
    ];

    const result = filterPrintersForBranch(printers, branch);
    expect(result).toEqual([]);
  });
});

describe("getBranchPrinterStats", () => {
  it("correctly counts assigned, disposed and other printers", () => {
    const printers: PrinterResponse[] = [
      mockPrinter({ id: 1, status: "asignada" }),
      mockPrinter({ id: 2, status: "asignada" }),
      mockPrinter({ id: 3, status: "enajenada" }),
      mockPrinter({ id: 4, status: "sin_asignar" }),
      mockPrinter({ id: 5, status: "laboratorio" }),
    ];

    const stats = getBranchPrinterStats(printers);
    expect(stats).toEqual({
      total: 5,
      assigned: 2,
      disposed: 1,
      other: 2,
    });
  });

  it("handles empty array", () => {
    expect(getBranchPrinterStats([])).toEqual({
      total: 0,
      assigned: 0,
      disposed: 0,
      other: 0,
    });
  });
});

describe("filterPrintersByQuickFilter", () => {
  const printers: PrinterResponse[] = [
    mockPrinter({ id: 1, fiscalSerial: "A1", status: "asignada" }),
    mockPrinter({ id: 2, fiscalSerial: "A2", status: "asignada" }),
    mockPrinter({ id: 3, fiscalSerial: "E1", status: "enajenada" }),
    mockPrinter({ id: 4, fiscalSerial: "O1", status: "sin_asignar" }),
    mockPrinter({ id: 5, fiscalSerial: "O2", status: "desincorporada" }),
  ];

  it("returns all printers for 'all'", () => {
    const res = filterPrintersByQuickFilter(printers, "all");
    expect(res).toHaveLength(5);
  });

  it("filters assigned printers for 'asignada'", () => {
    const res = filterPrintersByQuickFilter(printers, "asignada");
    expect(res.map((p) => p.fiscalSerial)).toEqual(["A1", "A2"]);
  });

  it("filters disposed printers for 'enajenada'", () => {
    const res = filterPrintersByQuickFilter(printers, "enajenada");
    expect(res.map((p) => p.fiscalSerial)).toEqual(["E1"]);
  });

  it("filters other printers for 'other'", () => {
    const res = filterPrintersByQuickFilter(printers, "other");
    expect(res.map((p) => p.fiscalSerial)).toEqual(["O1", "O2"]);
  });
});
