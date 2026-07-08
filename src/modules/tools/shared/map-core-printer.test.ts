import { describe, expect, it } from "vitest";
import {
  findToolsPrinterBySerial,
  mapCorePrinterToTools,
} from "@/modules/tools/shared/map-core-printer";
import type { ClientResponse } from "@/types/branch-role";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse } from "@/types/printer";

const printer: PrinterResponse = {
  id: 7,
  modelId: 3,
  softwareId: null,
  clientId: 15,
  fiscalSerial: "ABC1234567",
  finalSalePrice: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  creationBatchId: null,
  status: "enajenada",
  distributorId: 2,
  paid: true,
  installationDate: null,
  versionFirmware: "2.1.0",
  macAddress: "AA:BB:CC:DD:EE:FF",
  deviceType: "interno",
  header: null,
  trailer: null,
};

const client: ClientResponse = {
  id: 15,
  branchId: 99,
  distributorId: 2,
  createdAt: "",
  reviewStatus: "ACTIVE",
  companyBusinessName: "Empresa Demo",
  companyRif: "J-12345678-9",
  branchPhone: "04141234567",
  branchEmail: "demo@example.com",
  branchCity: "Caracas",
  branchState: "Distrito Capital",
  branchAddress: "Av. Principal",
};

const model: PrinterModelResponse = {
  id: 3,
  brand: "MarcaX",
  modelCode: "MX-100",
  providencia: "",
  approvalDate: "",
  createdAt: "",
  price: 0,
};

describe("mapCorePrinterToTools", () => {
  it("maps fiscal serial, model, client and status for admin", () => {
    const mapped = mapCorePrinterToTools({
      printer,
      client,
      model,
      role: "ADMIN",
    });

    expect(mapped.serial).toBe("ABC1234567");
    expect(mapped.marca).toBe("MarcaX");
    expect(mapped.modelo).toBe("MX-100");
    expect(mapped.estado).toBe("Enajenada");
    expect(mapped.rifCliente).toBe("J-12345678-9");
    expect(mapped.ubicacion).toBe("Distrito Capital");
    expect(mapped.clientSummary?.email).toBe("demo@example.com");
  });

  it("uses distributor terminology for assigned printers", () => {
    const mapped = mapCorePrinterToTools({
      printer: { ...printer, status: "asignada" },
      client,
      model,
      role: "DISTRIBUTOR",
    });

    expect(mapped.estado).toBe("No Enajenada");
  });

  it("finds printers by serial case-insensitively", () => {
    const mapped = mapCorePrinterToTools({
      printer,
      client,
      model,
      role: "ADMIN",
    });

    expect(findToolsPrinterBySerial([mapped], "abc1234567")?.id).toBe(7);
  });
});
