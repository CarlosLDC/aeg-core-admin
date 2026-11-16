import { describe, expect, it } from "vitest";
import {
  filterCommercialInvoicesByQuickFilter,
  filterCommercialInvoicesForBranch,
  getBranchCommercialInvoiceStats,
} from "@/lib/branch-commercial-invoices";
import type { CommercialInvoiceResponse } from "@/types/commercial-invoice";

function makeInvoice(
  overrides: Partial<CommercialInvoiceResponse> & { id: number },
): CommercialInvoiceResponse {
  return {
    numeroFactura: `FAC-${overrides.id}`,
    empresaId: 10,
    empresaNombre: "Empresa Demo",
    empresaRif: "J-12345678-9",
    clienteComercialId: null,
    clienteComercialNombre: null,
    modalidad: "VENTA",
    estadoCobro: "PAGADO",
    createdAt: "2026-01-01T00:00:00Z",
    paymentCount: 1,
    paidAmountTotal: 100,
    printerCount: 2,
    ...overrides,
  };
}

describe("filterCommercialInvoicesForBranch", () => {
  it("filtra únicamente las facturas cuyo empresaId coincide con branch.companyId", () => {
    const invoices = [
      makeInvoice({ id: 1, empresaId: 10 }),
      makeInvoice({ id: 2, empresaId: 20 }),
      makeInvoice({ id: 3, empresaId: null }),
      makeInvoice({ id: 4, empresaId: 10 }),
    ];

    const result = filterCommercialInvoicesForBranch(invoices, {
      companyId: 10,
    });

    expect(result.map((inv) => inv.id)).toEqual([1, 4]);
  });
});

describe("getBranchCommercialInvoiceStats & filterCommercialInvoicesByQuickFilter", () => {
  const invoices = [
    makeInvoice({ id: 1, estadoCobro: "PAGADO" }),
    makeInvoice({ id: 2, estadoCobro: "PAGO_PARCIAL" }),
    makeInvoice({ id: 3, estadoCobro: "DEBE_IVA" }),
    makeInvoice({ id: 4, estadoCobro: "PENDIENTE_PAGO" }),
    makeInvoice({ id: 5, estadoCobro: "POR_FACTURAR" }),
    makeInvoice({ id: 6, estadoCobro: "SIN_CARGO" }),
  ];

  it("calcula estadísticas por grupo de estado de cobro", () => {
    expect(getBranchCommercialInvoiceStats(invoices)).toEqual({
      total: 6,
      paid: 1,
      pending: 4,
      other: 1,
    });
  });

  it("filtra por quick filter all, paid, pending y other", () => {
    expect(
      filterCommercialInvoicesByQuickFilter(invoices, "all").map((i) => i.id),
    ).toEqual([1, 2, 3, 4, 5, 6]);
    expect(
      filterCommercialInvoicesByQuickFilter(invoices, "paid").map((i) => i.id),
    ).toEqual([1]);
    expect(
      filterCommercialInvoicesByQuickFilter(invoices, "pending").map(
        (i) => i.id,
      ),
    ).toEqual([2, 3, 4, 5]);
    expect(
      filterCommercialInvoicesByQuickFilter(invoices, "other").map((i) => i.id),
    ).toEqual([6]);
  });
});
