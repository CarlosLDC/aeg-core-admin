import { describe, expect, it } from "vitest";
import {
  formatVenezuelanPhone,
  normalizeVenezuelanPhoneDigits,
  VENEZUELAN_PHONE_PLACEHOLDER,
} from "@/lib/venezuelan-phone";

describe("venezuelan-phone", () => {
  it("normaliza dígitos eliminando 0 inicial y código de país 58", () => {
    expect(normalizeVenezuelanPhoneDigits("04121851051")).toBe("4121851051");
    expect(normalizeVenezuelanPhoneDigits("+584121851051")).toBe("4121851051");
    expect(normalizeVenezuelanPhoneDigits("+58 0412 185 1051")).toBe("4121851051");
    expect(normalizeVenezuelanPhoneDigits("412 185 1051")).toBe("4121851051");
    expect(normalizeVenezuelanPhoneDigits("")).toBe("");
    expect(normalizeVenezuelanPhoneDigits(null)).toBe("");
    expect(normalizeVenezuelanPhoneDigits(undefined)).toBe("");
  });

  it("formatea con máscara venezolana XXX XXX XXXX (ej. 04121851051 -> 412 185 1051)", () => {
    expect(formatVenezuelanPhone("04121851051")).toBe("412 185 1051");
    expect(formatVenezuelanPhone("4121851051")).toBe("412 185 1051");
    expect(formatVenezuelanPhone("+584121851051")).toBe("412 185 1051");
    expect(formatVenezuelanPhone("0414-1234567")).toBe("414 123 4567");
    expect(formatVenezuelanPhone("0212 9998877")).toBe("212 999 8877");
  });

  it("formatea progresivamente mientras el usuario escribe", () => {
    expect(formatVenezuelanPhone("4")).toBe("4");
    expect(formatVenezuelanPhone("412")).toBe("412");
    expect(formatVenezuelanPhone("4121")).toBe("412 1");
    expect(formatVenezuelanPhone("41218")).toBe("412 18");
    expect(formatVenezuelanPhone("412185")).toBe("412 185");
    expect(formatVenezuelanPhone("4121851")).toBe("412 185 1");
    expect(formatVenezuelanPhone("41218510")).toBe("412 185 10");
    expect(formatVenezuelanPhone("412185105")).toBe("412 185 105");
    expect(formatVenezuelanPhone("4121851051")).toBe("412 185 1051");
  });

  it("ignora caracteres no numéricos y maneja valores vacíos", () => {
    expect(formatVenezuelanPhone("")).toBe("");
    expect(formatVenezuelanPhone("abc")).toBe("");
    expect(formatVenezuelanPhone(null)).toBe("");
    expect(formatVenezuelanPhone(undefined)).toBe("");
  });

  it("provee un placeholder de ejemplo con el formato esperado", () => {
    expect(VENEZUELAN_PHONE_PLACEHOLDER).toBe("412 185 1051");
  });
});
