import { describe, expect, it } from "vitest";
import {
  commercialInvoiceToFormValues,
  emptyCommercialInvoiceForm,
  formatCommercialInvoiceTitle,
  toCommercialInvoiceRequest,
} from "./commercial-invoice-form";

describe("commercial-invoice-form", () => {
  it("formats invoice title with invoice number or id fallback", () => {
    expect(
      formatCommercialInvoiceTitle({
        id: 7,
        numeroFactura: "FAC-001",
      }),
    ).toBe("FAC-001");
    expect(
      formatCommercialInvoiceTitle({
        id: 7,
        numeroFactura: null,
      }),
    ).toBe("Factura #7");
  });

  it("maps form values with all 4 required fields", () => {
    const empty = emptyCommercialInvoiceForm();
    expect(empty.modalidad).toBe("VENTA");
    expect(empty.estadoCobro).toBe("PAGADO");

    const req = toCommercialInvoiceRequest({
      numeroFactura: "  FAC-2026-01 ",
      empresaId: " 5 ",
      modalidad: "CONSIGNACION",
      estadoCobro: "PAGO_PARCIAL",
    });

    expect(req).toEqual({
      numeroFactura: "FAC-2026-01",
      empresaId: 5,
      modalidad: "CONSIGNACION",
      estadoCobro: "PAGO_PARCIAL",
    });
  });

  it("validates required fields", () => {
    expect(
      toCommercialInvoiceRequest({
        numeroFactura: "",
        empresaId: "5",
        modalidad: "VENTA",
        estadoCobro: "PAGADO",
      }),
    ).toMatch(/número de factura es obligatorio/i);

    expect(
      toCommercialInvoiceRequest({
        numeroFactura: "FAC-001",
        empresaId: "",
        modalidad: "VENTA",
        estadoCobro: "PAGADO",
      }),
    ).toMatch(/empresa es obligatoria/i);
  });

  it("hydrates form values from response", () => {
    const values = commercialInvoiceToFormValues({
      id: 12,
      numeroFactura: "FAC-12",
      empresaId: 5,
      empresaNombre: "Inversiones Demo",
      empresaRif: "J-12345678-9",
      clienteComercialId: null,
      clienteComercialNombre: "Inversiones Demo",
      modalidad: "PRESTAMO",
      estadoCobro: "PENDIENTE_PAGO",
      createdAt: "2026-11-13T10:00:00Z",
      paymentCount: 1,
      paidAmountTotal: 120,
      printerCount: 2,
    });

    expect(values).toEqual({
      numeroFactura: "FAC-12",
      empresaId: "5",
      modalidad: "PRESTAMO",
      estadoCobro: "PENDIENTE_PAGO",
    });
  });
});
