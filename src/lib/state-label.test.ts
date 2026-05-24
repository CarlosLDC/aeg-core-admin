import { describe, expect, it } from "vitest";
import { normalizeStateName, statesMatch } from "@/lib/state-label";
import { uniqueStateFilterOptions } from "@/lib/table-filter-options";

describe("normalizeStateName", () => {
  it("title-cases uppercase state names", () => {
    expect(normalizeStateName("BOLÍVAR")).toBe("Bolívar");
    expect(normalizeStateName("  distrito capital  ")).toBe("Distrito Capital");
  });
});

describe("statesMatch", () => {
  it("matches states regardless of casing", () => {
    expect(statesMatch("BOLÍVAR", "Bolívar")).toBe(true);
    expect(statesMatch("Miranda", "MIRANDA")).toBe(true);
    expect(statesMatch("Zulia", "Carabobo")).toBe(false);
  });
});

describe("uniqueStateFilterOptions", () => {
  it("deduplicates states by normalized label", () => {
    const options = uniqueStateFilterOptions(["BOLÍVAR", "Bolívar", "Miranda"]);
    expect(options.map((o) => o.label)).toEqual(["Bolívar", "Miranda"]);
  });
});
