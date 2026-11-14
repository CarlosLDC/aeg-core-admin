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

  it("maps form values with distributor or client", () => {
    const empty = emptyCommercialInvoiceForm();
    expect(empty.recipientType).toBe("DISTRIBUTOR");
    expect(empty.modalidad).toBe("VENTA");
    expect(empty.estadoCobro).toBe("PAGADO");

    const distributorReq = toCommercialInvoiceRequest({
      numeroFactura: "  FAC-2026-01 ",
      recipientType: "DISTRIBUTOR",
      distribuidorId: " 5 ",
      clienteId: "99",
      modalidad: "CONSIGNACION",
      estadoCobro: "PAGO_PARCIAL",
    });

    expect(distributorReq).toEqual({
      numeroFactura: "FAC-2026-01",
      distribuidorId: 5,
      clienteId: null,
      modalidad: "CONSIGNACION",
      estadoCobro: "PAGO_PARCIAL",
    });

    const clientReq = toCommercialInvoiceRequest({
      numeroFactura: "FAC-2026-02",
      recipientType: "CLIENT",
      distribuidorId: "5",
      clienteId: "12",
      modalidad: "VENTA",
      estadoCobro: "PAGADO",
    });

    expect(clientReq).toEqual({
      numeroFactura: "FAC-2026-02",
      distribuidorId: null,
      clienteId: 12,
      modalidad: "VENTA",
      estadoCobro: "PAGADO",
    });
  });

  it("validates required fields", () => {
    expect(
      toCommercialInvoiceRequest({
        numeroFactura: "",
        recipientType: "DISTRIBUTOR",
        distribuidorId: "5",
        clienteId: "",
        modalidad: "VENTA",
        estadoCobro: "PAGADO",
      }),
    ).toMatch(/número de factura es obligatorio/i);

    expect(
      toCommercialInvoiceRequest({
        numeroFactura: "FAC-001",
        recipientType: "DISTRIBUTOR",
        distribuidorId: "",
        clienteId: "",
        modalidad: "VENTA",
        estadoCobro: "PAGADO",
      }),
    ).toMatch(/distribuidor/i);

    expect(
      toCommercialInvoiceRequest({
        numeroFactura: "FAC-001",
        recipientType: "CLIENT",
        distribuidorId: "",
        clienteId: "",
        modalidad: "VENTA",
        estadoCobro: "PAGADO",
      }),
    ).toMatch(/cliente/i);
  });

  it("hydrates form values from response", () => {
    const distributorValues = commercialInvoiceToFormValues({
      id: 12,
      numeroFactura: "FAC-12",
      distribuidorId: 5,
      distribuidorNombre: "Distribuidora Demo",
      clienteId: null,
      clienteNombre: null,
      clienteComercialId: null,
      clienteComercialNombre: "Distribuidora Demo",
      modalidad: "PRESTAMO",
      estadoCobro: "PENDIENTE_PAGO",
      createdAt: "2026-11-13T10:00:00Z",
      paymentCount: 1,
      paidAmountTotal: 120,
      printerCount: 2,
    });

    expect(distributorValues).toEqual({
      numeroFactura: "FAC-12",
      recipientType: "DISTRIBUTOR",
      distribuidorId: "5",
      clienteId: "",
      modalidad: "PRESTAMO",
      estadoCobro: "PENDIENTE_PAGO",
    });

    const clientValues = commercialInvoiceToFormValues({
      id: 13,
      numeroFactura: "FAC-13",
      distribuidorId: null,
      distribuidorNombre: null,
      clienteId: 18,
      clienteNombre: "Inversiones Demo",
      clienteComercialId: null,
      clienteComercialNombre: "Inversiones Demo",
      modalidad: "VENTA",
      estadoCobro: "PAGADO",
      createdAt: "2026-11-13T10:00:00Z",
      paymentCount: 0,
      paidAmountTotal: 0,
      printerCount: 1,
    });

    expect(clientValues).toEqual({
      numeroFactura: "FAC-13",
      recipientType: "CLIENT",
      distribuidorId: "",
      clienteId: "18",
      modalidad: "VENTA",
      estadoCobro: "PAGADO",
    });
  });
});
