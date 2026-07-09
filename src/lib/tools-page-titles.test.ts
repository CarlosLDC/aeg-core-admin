import { describe, expect, it } from "vitest";
import { toolsPageTitle } from "@/lib/tools-page-titles";

describe("toolsPageTitle", () => {
  it("returns base title without suffix", () => {
    expect(toolsPageTitle()).toBe("AEG Tools");
    expect(toolsPageTitle("")).toBe("AEG Tools");
    expect(toolsPageTitle("   ")).toBe("AEG Tools");
  });

  it("appends suffix after base title", () => {
    expect(toolsPageTitle("GRA0000009")).toBe("AEG Tools - GRA0000009");
    expect(toolsPageTitle("Formas de pago")).toBe("AEG Tools - Formas de pago");
  });
});
