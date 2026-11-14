import { describe, expect, it } from "vitest";
import {
  commercialInvoiceToFormValues,
  emptyCommercialInvoiceForm,
  formatCommercialInvoiceTitle,
  toCommercialInvoiceRequest,
} from "./commercial-invoice-form";

describe("commercial-invoice-form", () => {
  it("formats invoice title with control suffix or id fallback", () => {
    expect(
      formatCommercialInvoiceTitle({
        id: 7,
        numeroFactura: "FAC-001",
        sufijoControl: "B2",
      }),
    ).toBe("FAC-001 (B2)");
    expect(
      formatCommercialInvoiceTitle({
        id: 7,
        numeroFactura: "FAC-001",
        sufijoControl: null,
      }),
    ).toBe("FAC-001");
    expect(
      formatCommercialInvoiceTitle({
        id: 7,
        numeroFactura: null,
        sufijoControl: null,
      }),
    ).toBe("Factura #7");
  });

  it("maps form values and trims blank optional fields to null", () => {
    const empty = emptyCommercialInvoiceForm();
    expect(empty.modalidad).toBe("VENTA");
    expect(empty.estadoCobro).toBe("PAGADO");

    const req = toCommercialInvoiceRequest({
      ...empty,
      numeroFactura: "  FAC-2026-01 ",
      sufijoControl: "  ",
      clienteComercialId: " 5 ",
      modalidad: "CONSIGNACION",
      estadoCobro: "PAGO_PARCIAL",
      promotorId: " 3 ",
      notasComerciales: "  Entrega parcial ",
    });

    expect(req).toEqual({
      numeroFactura: "FAC-2026-01",
      sufijoControl: null,
      clienteComercialId: 5,
      modalidad: "CONSIGNACION",
      estadoCobro: "PAGO_PARCIAL",
      promotorId: 3,
      notasComerciales: "Entrega parcial",
    });
  });

  it("hydrates form values from response", () => {
    const values = commercialInvoiceToFormValues({
      id: 12,
      numeroFactura: "FAC-12",
      sufijoControl: "A",
      clienteComercialId: null,
      clienteComercialNombre: null,
      modalidad: "PRESTAMO",
      estadoCobro: "PENDIENTE_PAGO",
      promotorId: null,
      promotorNombre: null,
      notasComerciales: "Préstamo temporal",
      createdAt: "2026-11-13T10:00:00Z",
      paymentCount: 1,
      paidAmountTotal: 120,
      printerCount: 2,
    });

    expect(values).toEqual({
      numeroFactura: "FAC-12",
      sufijoControl: "A",
      clienteComercialId: "",
      modalidad: "PRESTAMO",
      estadoCobro: "PENDIENTE_PAGO",
      promotorId: "",
      notasComerciales: "Préstamo temporal",
    });
  });
});
