import { describe, expect, it } from "vitest";
import {
  commercialPaymentToFormValues,
  emptyCommercialPaymentForm,
  parsePaymentAmount,
  toCommercialPaymentRequest,
} from "./commercial-payment-form";

describe("commercial-payment-form", () => {
  it("parses payment amounts cleanly", () => {
    expect(parsePaymentAmount("")).toBeNull();
    expect(parsePaymentAmount("150.50")).toBe(150.5);
    expect(parsePaymentAmount("99,955")).toBe(99.96);
    expect(parsePaymentAmount("-10")).toBe("invalid");
    expect(parsePaymentAmount("abc")).toBe("invalid");
  });

  it("validates and transforms form values to request payload", () => {
    const invalid = toCommercialPaymentRequest(emptyCommercialPaymentForm());
    expect(invalid).toBe("Selecciona una factura comercial válida.");

    const valid = toCommercialPaymentRequest({
      facturaComercialId: "15",
      metodoBanco: "ZELLE",
      referencia: "  Z-88321 ",
      monto: "250.75",
      cuentaDestino: " pagos@aeg.com ",
      fechaPago: "2026-11-20",
      notas: "  Abono cuota 1  ",
    });

    expect(valid).toEqual({
      facturaComercialId: 15,
      metodoBanco: "ZELLE",
      referencia: "Z-88321",
      monto: 250.75,
      cuentaDestino: "pagos@aeg.com",
      fechaPago: "2026-11-20",
      notas: "Abono cuota 1",
    });

    const invalidDate = toCommercialPaymentRequest({
      facturaComercialId: "15",
      metodoBanco: "ZELLE",
      referencia: "",
      monto: "100",
      cuentaDestino: "",
      fechaPago: "20-11-2026",
      notas: "",
    });
    expect(invalidDate).toMatch(/fecha de pago/i);

    const withMarkPaid = toCommercialPaymentRequest({
      facturaComercialId: "15",
      metodoBanco: "ZELLE",
      referencia: "Z-88321",
      monto: "250.75",
      cuentaDestino: "pagos@aeg.com",
      fechaPago: "",
      notas: "",
      markInvoiceAsPaid: true,
    });

    expect(withMarkPaid).toEqual({
      facturaComercialId: 15,
      metodoBanco: "ZELLE",
      referencia: "Z-88321",
      monto: 250.75,
      cuentaDestino: "pagos@aeg.com",
      fechaPago: null,
      notas: null,
      markInvoiceAsPaid: true,
    });
  });

  it("hydrates form values from response", () => {
    const empty = emptyCommercialPaymentForm(9);
    expect(empty.fechaPago).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(empty.notas).toBe("");

    const values = commercialPaymentToFormValues({
      id: 3,
      facturaComercialId: 9,
      numeroFactura: "FAC-09",
      empresaId: 4,
      clienteComercialId: 1,
      clienteComercialNombre: "Cliente X",
      metodoBanco: "BINANCE",
      referencia: null,
      monto: 400,
      cuentaDestino: "USDT-TRC20",
      fechaPago: "2026-11-12",
      notas: "Pago recibido",
      registeredById: 1,
      registeredByName: "Admin",
      createdAt: "2026-11-13T10:00:00Z",
    });

    expect(values).toEqual({
      facturaComercialId: "9",
      metodoBanco: "BINANCE",
      referencia: "",
      monto: "400",
      cuentaDestino: "USDT-TRC20",
      fechaPago: "2026-11-12",
      notas: "Pago recibido",
    });
  });
});
