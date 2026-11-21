import { describe, expect, it } from "vitest";
import {
  buildAuthorizeEnajenacionPayload,
  emptyAuthorizeNewInvoiceForm,
  resolvePrinterDistributorCompanyId,
  sortCommercialInvoicesForPrinter,
} from "./printer-authorize-enajenacion";
import type { CommercialInvoiceResponse } from "@/types/commercial-invoice";

function makeInvoice(
  overrides: Partial<CommercialInvoiceResponse> & { id: number },
): CommercialInvoiceResponse {
  return {
    numeroFactura: `FAC-${overrides.id}`,
    empresaId: 1,
    empresaNombre: "Empresa 1",
    empresaRif: "J-1",
    clienteComercialId: null,
    clienteComercialNombre: "Empresa 1",
    modalidad: "VENTA",
    estadoCobro: "PENDIENTE_PAGO",
    createdAt: "2026-11-10T10:00:00Z",
    paymentCount: 0,
    paidAmountTotal: 0,
    printerCount: 0,
    ...overrides,
  };
}

describe("printer-authorize-enajenacion", () => {
  it("resolves distributor company id from printer distributor and branches", () => {
    const companyId = resolvePrinterDistributorCompanyId(
      { distributorId: 12 },
      [{ id: 12, branchId: 33, createdAt: "2026-11-01T00:00:00Z" }],
      [
        {
          id: 33,
          companyId: 88,
          city: "Caracas",
          state: "DC",
          address: "Av 1",
          phone: "",
          email: "",
          createdAt: "2026-11-01T00:00:00Z",
        },
      ],
    );
    expect(companyId).toBe(88);
    expect(
      resolvePrinterDistributorCompanyId({ distributorId: null }, [], []),
    ).toBeNull();
  });

  it("sorts invoices prioritizing printer's linked invoice, then preferred company, newest first", () => {
    const invOtherOld = makeInvoice({
      id: 1,
      empresaId: 99,
      createdAt: "2026-11-01T00:00:00Z",
    });
    const invPrefOld = makeInvoice({
      id: 2,
      empresaId: 7,
      createdAt: "2026-11-05T00:00:00Z",
    });
    const invPrefNew = makeInvoice({
      id: 3,
      empresaId: 7,
      createdAt: "2026-11-15T00:00:00Z",
    });
    const invLinked = makeInvoice({
      id: 4,
      empresaId: 99,
      createdAt: "2026-11-02T00:00:00Z",
    });

    const sorted = sortCommercialInvoicesForPrinter(
      [invOtherOld, invPrefOld, invPrefNew, invLinked],
      { facturaComercialId: 4 },
      7,
    );

    expect(sorted.map((i) => i.id)).toEqual([4, 3, 2, 1]);
  });

  it("builds default new invoice form with VENTA and PENDIENTE_PAGO", () => {
    expect(emptyAuthorizeNewInvoiceForm(42)).toEqual({
      numeroFactura: "",
      empresaId: "42",
      modalidad: "VENTA",
      estadoCobro: "PENDIENTE_PAGO",
    });
    expect(emptyAuthorizeNewInvoiceForm(null)).toEqual({
      numeroFactura: "",
      empresaId: "",
      modalidad: "VENTA",
      estadoCobro: "PENDIENTE_PAGO",
    });
  });

  it("validates credit terms and builds payload for existing invoice", () => {
    expect(
      buildAuthorizeEnajenacionPayload({
        creditInstallments: "0",
        finalSalePrice: "",
        invoiceMode: "existing",
        selectedInvoiceId: "10",
        newInvoice: emptyAuthorizeNewInvoiceForm(),
      }),
    ).toMatch(/cuotas válido/i);

    expect(
      buildAuthorizeEnajenacionPayload({
        creditInstallments: "4",
        finalSalePrice: "-5",
        invoiceMode: "existing",
        selectedInvoiceId: "10",
        newInvoice: emptyAuthorizeNewInvoiceForm(),
      }),
    ).toMatch(/no puede ser negativo/i);

    expect(
      buildAuthorizeEnajenacionPayload({
        creditInstallments: "4",
        finalSalePrice: "",
        invoiceMode: "existing",
        selectedInvoiceId: "",
        newInvoice: emptyAuthorizeNewInvoiceForm(),
      }),
    ).toMatch(/factura comercial/i);

    expect(
      buildAuthorizeEnajenacionPayload({
        creditInstallments: "4",
        finalSalePrice: "450.5",
        invoiceMode: "existing",
        selectedInvoiceId: "10",
        newInvoice: emptyAuthorizeNewInvoiceForm(),
      }),
    ).toEqual({
      creditInstallments: 4,
      finalSalePrice: 450.5,
      facturaComercialId: 10,
    });
  });

  it("validates new invoice fields and builds payload for new invoice", () => {
    expect(
      buildAuthorizeEnajenacionPayload({
        creditInstallments: "3",
        finalSalePrice: "",
        invoiceMode: "new",
        selectedInvoiceId: "",
        newInvoice: emptyAuthorizeNewInvoiceForm(7),
      }),
    ).toMatch(/número de factura es obligatorio/i);

    expect(
      buildAuthorizeEnajenacionPayload({
        creditInstallments: "3",
        finalSalePrice: "",
        invoiceMode: "new",
        selectedInvoiceId: "",
        newInvoice: {
          numeroFactura: " FAC-100 ",
          empresaId: "7",
          modalidad: "VENTA",
          estadoCobro: "PENDIENTE_PAGO",
        },
      }),
    ).toEqual({
      creditInstallments: 3,
      finalSalePrice: null,
      newCommercialInvoice: {
        numeroFactura: "FAC-100",
        empresaId: 7,
        modalidad: "VENTA",
        estadoCobro: "PENDIENTE_PAGO",
      },
    });
  });
});
