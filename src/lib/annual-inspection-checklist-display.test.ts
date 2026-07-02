import { describe, expect, it } from "vitest";
import {
  annualInspectionChecklistRows,
  summarizeAnnualInspectionChecklist,
} from "@/lib/annual-inspection-checklist-display";
import type { AnnualInspectionResponse } from "@/types/annual-inspection";

const baseInspection = {
  id: 1,
  printerId: 1,
  userId: 10,
  notes: null,
  inspectionDate: "2026-01-01",
  createdAt: "2026-01-01T00:00:00Z",
  mqttRegistroImpresora: null,
  mqttSetDateRevOAt: null,
  mqttNumeroFacturaPrueba: null,
} as AnnualInspectionResponse;

describe("annualInspectionChecklistRows", () => {
  it("infers precinto from legacy sealTampered", () => {
    const rows = annualInspectionChecklistRows({
      ...baseInspection,
      sealTampered: true,
    });
    expect(rows.find((row) => row.label === "Precinto")?.value).toBe(
      "Precinto violentado",
    );
  });

  it("shows persisted checklist values", () => {
    const rows = annualInspectionChecklistRows({
      ...baseInspection,
      sealTampered: false,
      chkPrecinto: true,
      chkEtiquetaFiscal: true,
      chkFactura: false,
      chkNotaCredito: true,
      chkSensorPapel: true,
    });
    expect(rows.find((row) => row.label === "Impresión de factura")?.value).toBe(
      "Impresión de factura defectuosa",
    );
  });
});

describe("summarizeAnnualInspectionChecklist", () => {
  it("summarizes full checklist", () => {
    expect(
      summarizeAnnualInspectionChecklist({
        ...baseInspection,
        sealTampered: false,
        chkPrecinto: true,
        chkEtiquetaFiscal: true,
        chkFactura: true,
        chkNotaCredito: true,
        chkSensorPapel: true,
      }),
    ).toBe("5/5 conformes");
  });

  it("falls back to legacy precinto summary", () => {
    expect(
      summarizeAnnualInspectionChecklist({
        ...baseInspection,
        sealTampered: true,
      }),
    ).toBe("Precinto violentado");
  });
});
