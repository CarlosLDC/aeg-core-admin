import { describe, expect, it } from "vitest";
import {
  annualInspectionPrinterOptions,
  emptyAnnualInspectionForm,
  setAnnualInspectionChecklistField,
  setAnnualInspectionSealTampered,
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
        inspectionDate: "",
        checklist: emptyAnnualInspectionForm().checklist,
      },
      printers,
    );

    expect(result).toBe(
      "Solo se pueden inspeccionar impresoras con estatus Asignada.",
    );
  });

  it("syncs sealTampered with chkPrecinto", () => {
    let form = emptyAnnualInspectionForm();
    form = setAnnualInspectionChecklistField(form, "chkPrecinto", true);
    expect(form.sealTampered).toBe(false);
    form = setAnnualInspectionSealTampered(form, true);
    expect(form.checklist.chkPrecinto).toBe(false);
  });

  it("includes persisted checklist in request payload", () => {
    let form = emptyAnnualInspectionForm();
    form.printerId = "1";
    form.userId = "10";
    form = setAnnualInspectionChecklistField(form, "chkPrecinto", true);
    form = setAnnualInspectionChecklistField(form, "chkEtiquetaFiscal", true);
    form = setAnnualInspectionChecklistField(form, "chkFactura", true);
    form = setAnnualInspectionChecklistField(form, "chkNotaCredito", false);
    form = setAnnualInspectionChecklistField(form, "chkSensorPapel", true);

    const result = toAnnualInspectionRequest(form, printers);
    expect(typeof result).not.toBe("string");
    if (typeof result === "string") return;

    expect(result).toMatchObject({
      sealTampered: false,
      chkPrecinto: true,
      chkEtiquetaFiscal: true,
      chkFactura: true,
      chkNotaCredito: false,
      chkSensorPapel: true,
    });
  });
});
