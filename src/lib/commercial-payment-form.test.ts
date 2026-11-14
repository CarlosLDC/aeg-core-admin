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
    });

    expect(valid).toEqual({
      facturaComercialId: 15,
      metodoBanco: "ZELLE",
      referencia: "Z-88321",
      monto: 250.75,
      cuentaDestino: "pagos@aeg.com",
    });
  });

  it("hydrates form values from response", () => {
    const values = commercialPaymentToFormValues({
      id: 3,
      facturaComercialId: 9,
      numeroFactura: "FAC-09",
      clienteComercialId: 1,
      clienteComercialNombre: "Cliente X",
      metodoBanco: "BINANCE",
      referencia: null,
      monto: 400,
      cuentaDestino: "USDT-TRC20",
      createdAt: "2026-11-13T10:00:00Z",
    });

    expect(values).toEqual({
      facturaComercialId: "9",
      metodoBanco: "BINANCE",
      referencia: "",
      monto: "400",
      cuentaDestino: "USDT-TRC20",
    });
  });
});
