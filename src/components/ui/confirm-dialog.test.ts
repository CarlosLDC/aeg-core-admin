import { describe, expect, it } from "vitest";
import {
  isConfirmTextMatch,
  normalizeConfirmText,
} from "@/components/ui/confirm-dialog";

describe("normalizeConfirmText", () => {
  it("trims whitespace and handles nullish values", () => {
    expect(normalizeConfirmText("  AEG-001  ")).toBe("AEG-001");
    expect(normalizeConfirmText(undefined)).toBe("");
    expect(normalizeConfirmText(null)).toBe("");
  });
});

describe("isConfirmTextMatch", () => {
  it("returns true when no confirmation text is required", () => {
    expect(isConfirmTextMatch("", undefined)).toBe(true);
    expect(isConfirmTextMatch("anything", "   ")).toBe(true);
  });

  it("requires exact case-sensitive match (ignoring outer whitespace)", () => {
    expect(isConfirmTextMatch("Inversiones C.A.", "Inversiones C.A.")).toBe(
      true,
    );
    expect(isConfirmTextMatch("  Inversiones C.A.  ", "Inversiones C.A.")).toBe(
      true,
    );
    expect(isConfirmTextMatch("inversiones c.a.", "Inversiones C.A.")).toBe(
      false,
    );
    expect(isConfirmTextMatch("", "Inversiones C.A.")).toBe(false);
    expect(isConfirmTextMatch("Inversiones", "Inversiones C.A.")).toBe(false);
  });
});
