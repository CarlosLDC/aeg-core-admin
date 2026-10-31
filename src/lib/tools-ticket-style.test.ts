import { describe, expect, it } from "vitest";
import {
  DEFAULT_TICKET_LINE_STYLE,
  defaultPeripheralsConfig,
  lineStyleToEscPos,
  maxCharsForStyle,
  normalizeLineStyles,
  normalizePulseMs,
  validateCashDrawer,
  validateCustomerDisplay,
  validateStyledLines,
} from "@/lib/tools-ticket-style";

describe("ticket line styles", () => {
  it("halves max chars with double width", () => {
    expect(maxCharsForStyle(DEFAULT_TICKET_LINE_STYLE)).toBe(50);
    expect(maxCharsForStyle({ ...DEFAULT_TICKET_LINE_STYLE, ancho: 2 })).toBe(25);
  });

  it("normalizes to line count filling defaults", () => {
    const styles = normalizeLineStyles([{ ...DEFAULT_TICKET_LINE_STYLE, neg: true }], 3);
    expect(styles).toHaveLength(3);
    expect(styles[0].neg).toBe(true);
    expect(styles[2]).toEqual(DEFAULT_TICKET_LINE_STYLE);
  });

  it("validates line length against style", () => {
    const line = "X".repeat(30);
    expect(validateStyledLines([line], [DEFAULT_TICKET_LINE_STYLE], "encabezado")).toBeNull();
    expect(
      validateStyledLines([line], [{ ...DEFAULT_TICKET_LINE_STYLE, ancho: 2 }], "encabezado"),
    ).toContain("máximo es 25");
  });

  it("builds ESC/POS sequence", () => {
    const bytes = lineStyleToEscPos({ neg: true, alto: 2, ancho: 2, sub: 1, alin: "C" });
    expect(bytes).toEqual([0x1b, 0x61, 1, 0x1b, 0x45, 1, 0x1b, 0x2d, 1, 0x1d, 0x21, 0x11]);
  });
});

describe("peripherals validation", () => {
  it("normalizes pulse to even values in range", () => {
    expect(normalizePulseMs(121)).toBe(120);
    expect(normalizePulseMs(5)).toBe(10);
    expect(normalizePulseMs(999)).toBe(510);
  });

  it("requires payment methods in FP mode", () => {
    const { gaveta } = defaultPeripheralsConfig();
    expect(validateCashDrawer({ ...gaveta, activo: true })).toBeNull();
    expect(validateCashDrawer({ ...gaveta, activo: true, fpAbre: [] })).toContain("forma de pago");
    expect(validateCashDrawer({ ...gaveta, activo: true, tOn: 121 })).toContain("par");
  });

  it("validates display welcome length", () => {
    const { visor } = defaultPeripheralsConfig();
    expect(validateCustomerDisplay({ ...visor, activo: true })).toBeNull();
    expect(
      validateCustomerDisplay({ ...visor, activo: true, bienv: ["X".repeat(21), ""] }),
    ).toContain("20");
  });
});
