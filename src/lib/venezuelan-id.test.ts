import { describe, expect, it } from "vitest";
import {
  formatCedula,
  formatRif,
  parseCedula,
  parsePrefixedDocument,
  parseRif,
} from "@/lib/venezuelan-id";

describe("parsePrefixedDocument", () => {
  it("splits letter and digits from a combined value", () => {
    expect(parsePrefixedDocument("J-315694205", ["J", "G"], "J")).toEqual({
      letter: "J",
      digits: "315694205",
    });
  });

  it("uses default letter for digit-only input", () => {
    expect(parsePrefixedDocument("12345678", ["V", "E"], "V")).toEqual({
      letter: "V",
      digits: "12345678",
    });
  });
});

describe("parseRif", () => {
  it("parses business RIF values", () => {
    expect(parseRif("j315694205")).toEqual({
      letter: "J",
      digits: "315694205",
    });
  });
});

describe("parseCedula", () => {
  it("parses national id values", () => {
    expect(parseCedula("E-12.345.678")).toEqual({
      letter: "E",
      digits: "12345678",
    });
  });
});

describe("formatPrefixedDocument helpers", () => {
  it("combines letter and digits", () => {
    expect(formatRif("G", "1234567")).toBe("G1234567");
    expect(formatCedula("V", "12345678")).toBe("V12345678");
  });

  it("returns empty string without digits", () => {
    expect(formatCedula("V", "")).toBe("");
  });
});
