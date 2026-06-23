import { describe, expect, it } from "vitest";
import {
  emptyPrinterForm,
  printerToFormValues,
  toPrinterEditRequest,
} from "@/lib/printer-form";
import type { PrinterResponse } from "@/types/printer";

const assignedPrinter: PrinterResponse = {
  id: 1,
  modelId: 10,
  softwareId: 20,
  clientId: 30,
  distributorId: 40,
  fiscalSerial: "ABC1234567",
  finalSalePrice: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "asignada",
  paid: false,
  installationDate: "2026-02-01T12:00:00.000Z",
  versionFirmware: "1.0.0",
  macAddress: "AA:BB:CC:DD:EE:FF",
  deviceType: "interno",
};

describe("printerToFormValues", () => {
  it("ignores undefined defaults so edit forms keep existing assignments", () => {
    const values = printerToFormValues(assignedPrinter, {
      distributorId: undefined,
    });

    expect(values.distributorId).toBe("40");
    expect(values.clientId).toBe("30");
    expect(values.softwareId).toBe("20");
  });
});

describe("toPrinterEditRequest", () => {
  it("preserves software when the assignment field is left empty on edit", () => {
    const values = {
      ...printerToFormValues(assignedPrinter),
      distributorId: "",
      clientId: "",
      softwareId: "",
      paid: true,
      installationDate: "",
    };

    const body = toPrinterEditRequest(values, assignedPrinter);
    expect(typeof body).not.toBe("string");
    if (typeof body === "string") return;

    expect(body.paid).toBe(true);
    expect(body.distributorId).toBeNull();
    expect(body.clientId).toBeNull();
    expect(body.softwareId).toBe(20);
    expect(body.installationDate).toBe(assignedPrinter.installationDate);
  });

  it("clears client when the form sends an empty client selection", () => {
    const values = {
      ...printerToFormValues(assignedPrinter),
      clientId: "",
    };

    const body = toPrinterEditRequest(values, assignedPrinter);
    expect(typeof body).not.toBe("string");
    if (typeof body === "string") return;

    expect(body.clientId).toBeNull();
    expect(body.distributorId).toBe(40);
  });

  it("clears assignments when status changes to sin_asignar", () => {
    const values = {
      ...printerToFormValues(assignedPrinter),
      status: "sin_asignar" as const,
      distributorId: "",
      clientId: "",
    };

    const body = toPrinterEditRequest(values, assignedPrinter);
    expect(typeof body).not.toBe("string");
    if (typeof body === "string") return;

    expect(body.distributorId).toBeNull();
    expect(body.clientId).toBeNull();
  });

  it("uses explicit assignment changes from the form", () => {
    const values = {
      ...emptyPrinterForm(printerToFormValues(assignedPrinter)),
      distributorId: "99",
      clientId: "88",
      softwareId: "77",
    };

    const body = toPrinterEditRequest(values, assignedPrinter);
    expect(typeof body).not.toBe("string");
    if (typeof body === "string") return;

    expect(body.distributorId).toBe(99);
    expect(body.clientId).toBe(88);
    expect(body.softwareId).toBe(77);
  });
});
