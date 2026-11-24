import { describe, expect, it } from "vitest";
import {
  defaultAssignmentNewInvoiceForm,
  getAssignmentWizardSteps,
  resolveAssignmentStepSubtitle,
  resolveAssignmentSubmitLabel,
  resolveCompanyIdForDistributorRif,
  sortCommercialInvoicesForAssignment,
  syncNewInvoiceDefaultsForPaid,
} from "@/lib/printer-assignment-wizard";
import type { CommercialInvoiceResponse } from "@/types/commercial-invoice";

function makeInvoice(
  overrides: Partial<CommercialInvoiceResponse> & { id: number },
): CommercialInvoiceResponse {
  return {
    numeroFactura: `FAC-${overrides.id}`,
    empresaId: 1,
    empresaNombre: "Empresa 1",
    empresaRif: "J-10000000-1",
    clienteComercialId: null,
    clienteComercialNombre: null,
    modalidad: "VENTA",
    estadoCobro: "PAGADO",
    createdAt: "2026-11-10T10:00:00Z",
    paymentCount: 0,
    paidAmountTotal: 0,
    printerCount: 0,
    ...overrides,
  };
}

describe("printer-assignment-wizard", () => {
  it("builds step labels with and without commercial invoice permission", () => {
    expect(getAssignmentWizardSteps(true)).toEqual([
      { step: 1, label: "Distribuidora" },
      { step: 2, label: "Pago y factura" },
    ]);
    expect(getAssignmentWizardSteps(false)).toEqual([
      { step: 1, label: "Distribuidora" },
      { step: 2, label: "Pago" },
    ]);
  });

  it("returns contextual subtitles and submit labels", () => {
    expect(resolveAssignmentStepSubtitle(1, true)).toContain("distribuidora");
    expect(resolveAssignmentStepSubtitle(2, true)).toContain(
      "factura comercial",
    );
    expect(resolveAssignmentStepSubtitle(2, false)).not.toContain(
      "factura comercial",
    );
    expect(resolveAssignmentSubmitLabel(1)).toBe("Siguiente");
    expect(resolveAssignmentSubmitLabel(2)).toBe("Asignar impresora");
  });

  it("matches distributor RIF to company id case-insensitively", () => {
    const companies = [
      { id: 10, rif: "J-12345678-9" },
      { id: 20, rif: "J-99999999-0" },
    ];
    expect(
      resolveCompanyIdForDistributorRif(" j-12345678-9 ", companies),
    ).toBe("10");
    expect(resolveCompanyIdForDistributorRif("J-00000000-0", companies)).toBe(
      "",
    );
    expect(resolveCompanyIdForDistributorRif(undefined, companies)).toBe("");
  });

  it("creates default new invoice values based on paid flag", () => {
    expect(defaultAssignmentNewInvoiceForm(true, "15")).toEqual({
      numeroFactura: "",
      empresaId: "15",
      modalidad: "VENTA",
      estadoCobro: "PAGADO",
      montoTotal: "",
    });
    expect(defaultAssignmentNewInvoiceForm(false)).toEqual({
      numeroFactura: "",
      empresaId: "",
      modalidad: "CONSIGNACION",
      estadoCobro: "PENDIENTE_PAGO",
      montoTotal: "",
    });
  });

  it("syncs new invoice defaults on paid toggle unless user touched them", () => {
    const initial = defaultAssignmentNewInvoiceForm(false, "15");
    expect(
      syncNewInvoiceDefaultsForPaid(initial, true, {
        modalidad: false,
        estadoCobro: false,
      }),
    ).toEqual({
      numeroFactura: "",
      empresaId: "15",
      modalidad: "VENTA",
      estadoCobro: "PAGADO",
      montoTotal: "",
    });

    const customized = {
      ...initial,
      modalidad: "PRESTAMO" as const,
      estadoCobro: "DEBE_IVA" as const,
    };
    expect(
      syncNewInvoiceDefaultsForPaid(customized, true, {
        modalidad: true,
        estadoCobro: false,
      }),
    ).toEqual({
      numeroFactura: "",
      empresaId: "15",
      modalidad: "PRESTAMO",
      estadoCobro: "PAGADO",
      montoTotal: "",
    });
  });

  it("sorts invoices prioritizing linked invoice, then distributor RIF, newest first", () => {
    const invOtherOld = makeInvoice({
      id: 1,
      empresaRif: "J-99999999-9",
      createdAt: "2026-11-01T00:00:00Z",
    });
    const invMatchOld = makeInvoice({
      id: 2,
      empresaRif: "J-12345678-9",
      createdAt: "2026-11-05T00:00:00Z",
    });
    const invMatchNew = makeInvoice({
      id: 3,
      empresaRif: "j-12345678-9",
      createdAt: "2026-11-15T00:00:00Z",
    });
    const invLinked = makeInvoice({
      id: 4,
      empresaRif: "J-99999999-9",
      createdAt: "2026-11-02T00:00:00Z",
    });

    const sorted = sortCommercialInvoicesForAssignment(
      [invOtherOld, invMatchOld, invMatchNew, invLinked],
      4,
      " J-12345678-9 ",
    );

    expect(sorted.map((i) => i.id)).toEqual([4, 3, 2, 1]);
  });
});
