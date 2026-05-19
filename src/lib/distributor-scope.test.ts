import { describe, expect, it } from "vitest";
import {
  distributorStaffBranchIds,
  filterEmployeesForDistributorStaff,
  filterPrinterModelsForDistributor,
} from "./distributor-scope";

describe("distributor-scope", () => {
  it("resolves staff branch from distributor row", () => {
    const ids = distributorStaffBranchIds(
      [{ id: 5, branchId: 100, createdAt: "" }],
      5,
    );
    expect([...ids]).toEqual([100]);
  });

  it("filters employees to distributor staff branches only", () => {
    const staff = new Set([10]);
    const rows = [
      { id: 1, branchId: 10, nationalId: "1", name: "A", phone: "", email: "", createdAt: "", type: "interno" },
      { id: 2, branchId: 99, nationalId: "2", name: "B", phone: "", email: "", createdAt: "", type: "interno" },
    ];
    const filtered = filterEmployeesForDistributorStaff(
      rows,
      "DISTRIBUTOR",
      staff,
    );
    expect(filtered.map((e) => e.id)).toEqual([1]);
  });

  it("filters printer models to those used by distributor printers", () => {
    const models = [
      { id: 1, brand: "A", modelCode: "X", providencia: "", approvalDate: "", createdAt: "", price: 0 },
      { id: 2, brand: "B", modelCode: "Y", providencia: "", approvalDate: "", createdAt: "", price: 0 },
    ];
    const printers = [
      {
        id: 1,
        modelId: 1,
        softwareId: 1,
        clientId: null,
        distributorId: 5,
        fiscalSerial: "S1",
        finalSalePrice: 0,
        createdAt: "",
        status: "activo",
        paid: false,
        installationDate: null,
        versionFirmware: "",
        macAddress: "",
        deviceType: "fiscal",
      },
    ];
    expect(filterPrinterModelsForDistributor(models, printers).map((m) => m.id)).toEqual([
      1,
    ]);
  });
});
