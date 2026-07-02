import { describe, expect, it, vi } from "vitest";
import {
  distributorStaffBranchIds,
  excludeDistributorSelfClients,
  excludeDistributorStaffBranches,
  filterPrinterModelsForDistributor,
  isDistributorSelfClient,
  loadDistributorStaffBranches,
  resolveDistributorStaffBranchId,
} from "./distributor-scope";
import { mockClient } from "@/lib/test-fixtures";
import type { PrinterResponse } from "@/types/printer";

vi.mock("@/lib/distributors-api", () => ({
  fetchDistributorById: vi.fn(),
}));

vi.mock("@/lib/branches-api", () => ({
  fetchBranchById: vi.fn(),
}));

import { fetchBranchById } from "@/lib/branches-api";
import { fetchDistributorById } from "@/lib/distributors-api";

describe("distributor-scope", () => {
  it("loads staff branch from distributor id", async () => {
    vi.mocked(fetchDistributorById).mockResolvedValue({
      id: 5,
      branchId: 100,
      createdAt: "",
    });
    vi.mocked(fetchBranchById).mockResolvedValue({
      id: 100,
      companyId: 1,
      city: "Caracas",
      state: "Distrito Capital",
      address: "",
      phone: "",
      email: "",
      createdAt: "",
    });
    const branches = await loadDistributorStaffBranches(5);
    expect(branches).toHaveLength(1);
    expect(branches[0].id).toBe(100);
  });

  it("resolves staff branch from distributor row", () => {
    const ids = distributorStaffBranchIds(
      [{ id: 5, branchId: 100, createdAt: "" }],
      5,
    );
    expect([...ids]).toEqual([100]);
  });

  it("excludes distributor staff branch from client options", () => {
    const rows = excludeDistributorSelfClients(
      [
        mockClient({ id: 1, branchId: 100, distributorId: 5 }),
        mockClient({ id: 2, branchId: 200, distributorId: 5 }),
      ],
      100,
    );
    expect(rows.map((row) => row.id)).toEqual([2]);
  });

  it("excludes distributor staff branch from branch lists", () => {
    expect(
      excludeDistributorStaffBranches(
        [{ id: 100 }, { id: 200 }],
        100,
      ).map((row) => row.id),
    ).toEqual([200]);
  });

  it("detects distributor self client by branch", () => {
    expect(
      isDistributorSelfClient(
        1,
        [mockClient({ id: 1, branchId: 100, distributorId: 5 })],
        100,
      ),
    ).toBe(true);
    expect(
      isDistributorSelfClient(
        2,
        [mockClient({ id: 2, branchId: 200, distributorId: 5 })],
        100,
      ),
    ).toBe(false);
  });

  it("resolves staff branch id from distributor catalog", () => {
    expect(
      resolveDistributorStaffBranchId(
        [{ id: 5, branchId: 100, createdAt: "" }],
        5,
      ),
    ).toBe(100);
  });

  it("filters printer models to those used by distributor printers", () => {
    const models = [
      { id: 1, brand: "A", modelCode: "X", providencia: "", approvalDate: "", createdAt: "", price: 0 },
      { id: 2, brand: "B", modelCode: "Y", providencia: "", approvalDate: "", createdAt: "", price: 0 },
    ];
    const printers: PrinterResponse[] = [
      {
        id: 1,
        modelId: 1,
        softwareId: 1,
        clientId: null,
        distributorId: 5,
        fiscalSerial: "S1",
        finalSalePrice: 0,
        createdAt: "",
        status: "sin_asignar",
        paid: false,
        installationDate: null,
        versionFirmware: "",
        macAddress: "",
        deviceType: "interno",
      },
    ];
    expect(filterPrinterModelsForDistributor(models, printers).map((m) => m.id)).toEqual([
      1,
    ]);
  });
});
