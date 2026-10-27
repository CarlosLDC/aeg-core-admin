import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeSearchText } from "@/components/ui/searchable-select";

describe("normalizeSearchText", () => {
  it("removes accents and converts to lower case", () => {
    expect(normalizeSearchText("Distribuidora Eléctrica C.A.")).toBe(
      "distribuidora electrica c.a.",
    );
  });
});

describe("matchesSearch", () => {
  const label = "Inversiones Tecnológicas 2020 C.A.";
  const extraSearchText = "15 J-31569420-5";

  it("returns true on empty query", () => {
    expect(matchesSearch("", label, extraSearchText)).toBe(true);
    expect(matchesSearch("   ", label, extraSearchText)).toBe(true);
  });

  it("matches by company name", () => {
    expect(matchesSearch("inversiones", label, extraSearchText)).toBe(true);
    expect(matchesSearch("Tecnologicas", label, extraSearchText)).toBe(true);
  });

  it("matches by exact RIF with dash", () => {
    expect(matchesSearch("J-31569420-5", label, extraSearchText)).toBe(true);
    expect(matchesSearch("j-31569420-5", label, extraSearchText)).toBe(true);
  });

  it("matches by RIF without dash or punctuation", () => {
    expect(matchesSearch("J315694205", label, extraSearchText)).toBe(true);
    expect(matchesSearch("j315694205", label, extraSearchText)).toBe(true);
  });

  it("matches by digits only", () => {
    expect(matchesSearch("315694205", label, extraSearchText)).toBe(true);
    expect(matchesSearch("31569420", label, extraSearchText)).toBe(true);
  });

  it("matches by RIF with space or other formatting", () => {
    expect(matchesSearch("J 315694205", label, extraSearchText)).toBe(true);
  });

  it("returns false for non-matching queries", () => {
    expect(matchesSearch("J-99999999-9", label, extraSearchText)).toBe(false);
    expect(matchesSearch("Panadería", label, extraSearchText)).toBe(false);
  });
});
