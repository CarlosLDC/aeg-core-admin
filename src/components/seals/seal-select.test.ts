import { describe, expect, it } from "vitest";
import { sealToSearchableOption } from "./seal-select";
import type { SealResponse } from "@/types/seal";

describe("seal-select helpers", () => {
  const sampleSeal: SealResponse = {
    id: 42,
    printerId: null,
    serial: "SEC-9876",
    color: "morado",
    status: "disponible",
    createdAt: "2026-03-01T10:00:00Z",
    installationDate: null,
    removalDate: null,
  };

  it("converts a seal to a SearchableSelect option format", () => {
    const option = sealToSearchableOption(sampleSeal);

    expect(option.value).toBe("42");
    expect(option.label).toBe("SEC-9876");
    expect(option.description).toBe("ID #42");
    expect(option.searchText).toContain("SEC-9876");
    expect(option.searchText).toContain("Morado");
    expect(option.searchText).toContain("morado");
    expect(option.searchText).toContain("42");
  });

  it("handles neon green seal color correctly in search text", () => {
    const neonSeal: SealResponse = {
      ...sampleSeal,
      id: 99,
      serial: "NEON-001",
      color: "verde_neon",
    };

    const option = sealToSearchableOption(neonSeal);
    expect(option.value).toBe("99");
    expect(option.label).toBe("NEON-001");
    expect(option.searchText).toContain("Verde neón");
    expect(option.searchText).toContain("verde_neon");
  });
});
