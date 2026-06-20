import { describe, expect, it } from "vitest";
import {
  annualInspectionPrinterOptions,
  toAnnualInspectionRequest,
  validateAnnualInspectionPrinter,
} from "@/lib/annual-inspection-form";
import type { PrinterResponse } from "@/types/printer";

const printers = [
  { id: 1, status: "asignada", fiscalSerial: "A-1" },
  { id: 2, status: "enajenada", fiscalSerial: "B-2" },
  { id: 3, status: "sin_asignar", fiscalSerial: "C-3" },
] as PrinterResponse[];

describe("validateAnnualInspectionPrinter", () => {
  it("accepts assigned printers", () => {
    expect(validateAnnualInspectionPrinter(printers[0])).toBeNull();
  });

  it("rejects non-assigned printers", () => {
    expect(validateAnnualInspectionPrinter(printers[1])).toBe(
      "Solo se pueden inspeccionar impresoras con estatus Asignada.",
    );
  });
});

describe("annualInspectionPrinterOptions", () => {
  it("only lists assigned printers", () => {
    const options = annualInspectionPrinterOptions(printers);
    expect(options.map((option) => option.value)).toEqual(["1"]);
  });
});

describe("toAnnualInspectionRequest", () => {
  it("rejects inspections for non-assigned printers", () => {
    const result = toAnnualInspectionRequest(
      {
        printerId: "2",
        userId: "10",
        sealTampered: false,
        notes: "",
        photoUrls: ["https://example.com/photo.jpg"],
        inspectionDate: "",
      },
      printers,
    );

    expect(result).toBe(
      "Solo se pueden inspeccionar impresoras con estatus Asignada.",
    );
  });
});
