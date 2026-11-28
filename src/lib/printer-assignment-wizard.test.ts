import { describe, expect, it } from "vitest";
import {
  assignmentOutcomeHint,
  assignmentPaymentsToRequest,
  buildAssignmentCloseConfirmMessage,
  createEmptyAssignmentPaymentDraft,
  getAssignmentWizardSteps,
  hasAssignmentPaymentDetails,
  resolveAssignmentStepSubtitle,
  resolveAssignmentSubmitLabel,
  sumAssignmentPaymentAmounts,
  validateAssignmentPaymentDraft,
} from "@/lib/printer-assignment-wizard";

describe("printer-assignment-wizard", () => {
  it("builds the three distributor, payment status, and payments steps", () => {
    expect(getAssignmentWizardSteps()).toEqual([
      { step: 1, label: "Distribuidora" },
      { step: 2, label: "Estado de pago" },
      { step: 3, label: "Pagos" },
    ]);
    expect(getAssignmentWizardSteps(false)).toEqual([
      { step: 1, label: "Distribuidora" },
      { step: 2, label: "Estado de pago" },
    ]);
    expect(resolveAssignmentStepSubtitle(1)).toContain("distribuidora");
    expect(resolveAssignmentStepSubtitle(2)).toContain("sin número ni monto");
    expect(resolveAssignmentStepSubtitle(3)).toContain("lista de pagos");
    expect(resolveAssignmentSubmitLabel(1)).toBe("Siguiente");
    expect(resolveAssignmentSubmitLabel(2)).toBe("Siguiente");
    expect(resolveAssignmentSubmitLabel(3)).toBe("Asignar impresora");
    expect(resolveAssignmentSubmitLabel(2, false)).toBe("Asignar impresora");
  });

  it("describes paid, consignment and credit outcomes", () => {
    expect(assignmentOutcomeHint(true, 0)).toContain("Asignada");
    expect(assignmentOutcomeHint(true, 2)).toContain("Asignada");
    expect(assignmentOutcomeHint(false, 0)).toContain("consignación");
    expect(assignmentOutcomeHint(false, 0)).not.toContain("crédito");
    expect(assignmentOutcomeHint(false, 1)).toContain("crédito");
    expect(assignmentOutcomeHint(false, 1)).toContain("consignación");
  });

  it("requires details when adding a draft from the composer and detects dirty state", () => {
    const empty = createEmptyAssignmentPaymentDraft();
    expect(hasAssignmentPaymentDetails(empty)).toBe(false);
    expect(
      validateAssignmentPaymentDraft(empty, { requireDetails: true }),
    ).toMatch(/indica al menos/i);

    const withAmount = { ...empty, monto: "150,25" };
    expect(hasAssignmentPaymentDetails(withAmount)).toBe(true);
    expect(
      validateAssignmentPaymentDraft(withAmount, { requireDetails: true }),
    ).toEqual({
      metodoBanco: "BNC",
      referencia: null,
      monto: 150.25,
      cuentaDestino: null,
      fechaPago: empty.fechaPago,
      notas: null,
    });
  });

  it("accepts an empty payment list, validates drafts, and sums amounts", () => {
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

    const drafts = [
      {
        key: "1",
        mode: "manual" as const,
        metodoBanco: "ZELLE" as const,
        referencia: " ABC ",
        monto: "12,50",
        cuentaDestino: "correo@example.com",
        fechaPago: "2026-11-27",
        notas: "",
      },
      {
        key: "2",
        mode: "manual" as const,
        metodoBanco: "BNC" as const,
        referencia: "999",
        monto: "37.5",
        cuentaDestino: "",
        fechaPago: "2026-11-28",
        notas: "Abono 2",
      },
    ];

    expect(assignmentPaymentsToRequest(drafts)).toEqual([
      {
        metodoBanco: "ZELLE",
        referencia: "ABC",
        monto: 12.5,
        cuentaDestino: "correo@example.com",
        fechaPago: "2026-11-27",
        notas: null,
      },
      {
        metodoBanco: "BNC",
        referencia: "999",
        monto: 37.5,
        cuentaDestino: null,
        fechaPago: "2026-11-28",
        notas: "Abono 2",
      },
    ]);

    expect(sumAssignmentPaymentAmounts(drafts)).toEqual({
      total: 50,
      countWithAmount: 2,
    });
  });

  it("formats singular and plural close confirmation messages", () => {
    expect(buildAssignmentCloseConfirmMessage(1)).toBe(
      "Has añadido 1 pago en esta asignación. Si cierras el modal, se perderá.",
    );
    expect(buildAssignmentCloseConfirmMessage(3)).toBe(
      "Has añadido 3 pagos en esta asignación. Si cierras el modal, se perderán.",
    );
  });
});
