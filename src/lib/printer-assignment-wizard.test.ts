import { describe, expect, it } from "vitest";
import {
  assignmentOutcomeHint,
  assignmentPaymentsToRequest,
  getAssignmentWizardSteps,
  resolveAssignmentStepSubtitle,
  resolveAssignmentSubmitLabel,
} from "@/lib/printer-assignment-wizard";

describe("printer-assignment-wizard", () => {
  it("builds the distributor and payment steps", () => {
    expect(getAssignmentWizardSteps()).toEqual([
      { step: 1, label: "Distribuidora" },
      { step: 2, label: "Pago" },
    ]);
    expect(resolveAssignmentStepSubtitle(1)).toContain("distribuidora");
    expect(resolveAssignmentStepSubtitle(2)).toContain("sin número ni monto");
    expect(resolveAssignmentSubmitLabel(1)).toBe("Siguiente");
    expect(resolveAssignmentSubmitLabel(2)).toBe("Asignar impresora");
  });

  it("describes paid, consignment and credit outcomes", () => {
    expect(assignmentOutcomeHint(true, 0)).toContain("Asignada");
    expect(assignmentOutcomeHint(true, 2)).toContain("Asignada");
    expect(assignmentOutcomeHint(false, 0)).toContain("consignación");
    expect(assignmentOutcomeHint(false, 0)).not.toContain("crédito");
    expect(assignmentOutcomeHint(false, 1)).toContain("crédito");
    expect(assignmentOutcomeHint(false, 1)).toContain("consignación");
  });

  it("accepts an empty payment list and validates drafts", () => {
    expect(assignmentPaymentsToRequest([])).toEqual([]);
    expect(
      assignmentPaymentsToRequest([
        {
          key: "1",
          mode: "choose",
          metodoBanco: "BNC",
          referencia: "",
          monto: "",
          cuentaDestino: "",
          fechaPago: "",
          notas: "",
        },
      ]),
    ).toMatch(/escanea el comprobante/i);
    expect(
      assignmentPaymentsToRequest([
        {
          key: "1",
          mode: "manual",
          metodoBanco: "ZELLE",
          referencia: " ABC ",
          monto: "12,50",
          cuentaDestino: "correo@example.com",
          fechaPago: "2026-11-27",
          notas: "",
        },
      ]),
    ).toEqual([
      {
        metodoBanco: "ZELLE",
        referencia: "ABC",
        monto: 12.5,
        cuentaDestino: "correo@example.com",
        fechaPago: "2026-11-27",
        notas: null,
      },
    ]);
  });
});
