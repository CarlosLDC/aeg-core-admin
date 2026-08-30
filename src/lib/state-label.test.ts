import { describe, expect, it } from "vitest";
import { normalizeStateName, statesMatch } from "@/lib/state-label";
import { uniqueStateFilterOptions } from "@/lib/table-filter-options";

describe("normalizeStateName", () => {
  it("normaliza nombres de estado a capitalización estándar con tildes", () => {
    expect(normalizeStateName("BOLÍVAR")).toBe("Bolívar");
    expect(normalizeStateName("BOLIVAR")).toBe("Bolívar");
    expect(normalizeStateName("bolivar")).toBe("Bolívar");
    expect(normalizeStateName("  distrito capital  ")).toBe("Distrito Capital");
    expect(normalizeStateName("TACHIRA")).toBe("Táchira");
    expect(normalizeStateName("ANZOATEGUI")).toBe("Anzoátegui");
    expect(normalizeStateName("FALCON")).toBe("Falcón");
    expect(normalizeStateName("GUARICO")).toBe("Guárico");
    expect(normalizeStateName("MERIDA")).toBe("Mérida");
    expect(normalizeStateName("VARGAS")).toBe("La Guaira");
  });
});

describe("statesMatch", () => {
  it("matches states regardless of casing and accents", () => {
    expect(statesMatch("BOLÍVAR", "Bolívar")).toBe(true);
    expect(statesMatch("BOLIVAR", "Bolívar")).toBe(true);
    expect(statesMatch("Miranda", "MIRANDA")).toBe(true);
    expect(statesMatch("TACHIRA", "Táchira")).toBe(true);
    expect(statesMatch("Zulia", "Carabobo")).toBe(false);
  });
});

describe("uniqueStateFilterOptions", () => {
  it("deduplicates states by normalized label", () => {
    const options = uniqueStateFilterOptions(["BOLIVAR", "Bolívar", "Miranda"]);
    expect(options.map((o) => o.label)).toEqual(["Bolívar", "Miranda"]);
  });
});

