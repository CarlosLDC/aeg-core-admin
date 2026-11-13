import { describe, expect, it } from "vitest";
import {
  applyModelPrefixToFiscalSerial,
  buildSerialRange,
  describeSerialRangePreview,
  extractFiscalSerialParts,
  formatSerialNumber,
  normalizeFiscalSerialDigits,
} from "@/lib/serial-range";

describe("serial-range", () => {
  it("formats fiscal serials with padding", () => {
    expect(formatSerialNumber("abc", 1, 7)).toBe("ABC0000001");
    expect(formatSerialNumber("XYZ", 1234567, 7)).toBe("XYZ1234567");
  });

  it("builds fiscal range", () => {
    const result = buildSerialRange(
      { prefix: "ABC", from: "1", to: "3" },
      { mode: "fiscal" },
    );
    expect(result).toEqual(["ABC0000001", "ABC0000002", "ABC0000003"]);
  });

  it("rejects invalid fiscal prefix", () => {
    const result = buildSerialRange(
      { prefix: "AB", from: "1", to: "2" },
      { mode: "fiscal" },
    );
    expect(typeof result).toBe("string");
  });

  it("builds seal-style range", () => {
    const result = buildSerialRange(
      { prefix: "SN-", from: "1", to: "2", digitLength: 3 },
      { mode: "seal" },
    );
    expect(result).toEqual(["SN-001", "SN-002"]);
  });

  it("describes preview with ellipsis", () => {
    const serials = ["A1", "A2", "A3", "A4", "A5"];
    expect(describeSerialRangePreview(serials)).toBe("A1, A2, A3 … A5");
  });

  it("normalizes 7-digit fiscal serial suffix", () => {
    expect(normalizeFiscalSerialDigits("")).toBe("0000000");
    expect(normalizeFiscalSerialDigits("17")).toBe("0000017");
    expect(normalizeFiscalSerialDigits("00000001")).toBe("0000001");
    expect(normalizeFiscalSerialDigits("00000017")).toBe("0000017");
    expect(normalizeFiscalSerialDigits("12345678")).toBe("1234567");
  });

  it("extracts and applies deduced model prefix", () => {
    expect(extractFiscalSerialParts("", "gra")).toEqual({
      prefix: "GRA",
      digits: "0000000",
    });
    expect(extractFiscalSerialParts("ABC0000042", "GRA")).toEqual({
      prefix: "GRA",
      digits: "0000042",
    });
    expect(applyModelPrefixToFiscalSerial("", "gra")).toBe("GRA0000000");
    expect(applyModelPrefixToFiscalSerial("ABC0000042", "GRA")).toBe(
      "GRA0000042",
    );
  });
});
