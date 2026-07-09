import { describe, expect, it } from "vitest";
import {
  FORMAS_PAGO_DESCRIPCION_MAX_LENGTH,
  FORMAS_PAGO_DIVISA_MAX,
  FORMAS_PAGO_DIVISA_MIN,
  isFormaPagoDivisa,
  normalizeFormaPagoDescripcion,
  validateFormaPagoDescripcion,
} from "@/lib/tools-formas-pago";

describe("tools-formas-pago", () => {
  it("marks payment methods 11 through 16 as currency", () => {
    expect(FORMAS_PAGO_DIVISA_MIN).toBe(11);
    expect(FORMAS_PAGO_DIVISA_MAX).toBe(16);
    expect(isFormaPagoDivisa(10)).toBe(false);
    expect(isFormaPagoDivisa(11)).toBe(true);
    expect(isFormaPagoDivisa(16)).toBe(true);
    expect(isFormaPagoDivisa(17)).toBe(false);
  });

  it("limits descriptions to 20 characters", () => {
    expect(FORMAS_PAGO_DESCRIPCION_MAX_LENGTH).toBe(20);
    expect(normalizeFormaPagoDescripcion("ABCDEFGHIJ1234567890")).toBe(
      "ABCDEFGHIJ1234567890",
    );
    expect(normalizeFormaPagoDescripcion("ABCDEFGHIJ12345678901")).toBe(
      "ABCDEFGHIJ1234567890",
    );
    expect(validateFormaPagoDescripcion("EFECTIVO")).toBeNull();
    expect(validateFormaPagoDescripcion("   ")).toBe(
      "La descripción no puede estar vacía.",
    );
    expect(validateFormaPagoDescripcion("A".repeat(21))).toBe(
      "La descripción no puede superar 20 caracteres.",
    );
  });
});
