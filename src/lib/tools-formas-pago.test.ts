import { describe, expect, it } from "vitest";
import {
  FORMAS_PAGO_DIVISA_MAX,
  FORMAS_PAGO_DIVISA_MIN,
  isFormaPagoDivisa,
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
});
