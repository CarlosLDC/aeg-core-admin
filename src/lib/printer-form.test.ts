import { describe, expect, it } from "vitest";
import { printerToUnassignmentRequest } from "./printer-form";
import type { PrinterResponse } from "@/types/printer";

const basePrinter: PrinterResponse = {
  id: 1,
  modelId: 10,
  softwareId: 20,
  clientId: 30,
  fiscalSerial: "ABC1234567",
  finalSalePrice: 100,
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "asignada",
  distributorId: 5,
  paid: true,
  installationDate: "2026-01-02T00:00:00.000Z",
  versionFirmware: "1.0.0",
  macAddress: "AA:BB:CC:DD:EE:FF",
  deviceType: "interno",
};

describe("printerToUnassignmentRequest", () => {
  it("clears distributor and sets sin_asignar", () => {
    const body = printerToUnassignmentRequest(basePrinter);
    expect(body.distributorId).toBeNull();
    expect(body.status).toBe("sin_asignar");
    expect(body.clientId).toBe(basePrinter.clientId);
    expect(body.fiscalSerial).toBe(basePrinter.fiscalSerial);
  });
});
