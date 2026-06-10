import { describe, expect, it } from "vitest";
import {
  resolveVenezuelanStateCatalogValue,
  toVenezuelanStateKey,
  venezuelanStateSelectOptions,
} from "@/lib/venezuelan-states";

describe("venezuelan-states", () => {
  it("normaliza claves sin tildes y en mayúsculas", () => {
    expect(toVenezuelanStateKey("bolívar")).toBe("BOLIVAR");
    expect(toVenezuelanStateKey("  miranda ")).toBe("MIRANDA");
  });

  it("resuelve variantes con tilde y alias", () => {
    expect(resolveVenezuelanStateCatalogValue("Bolívar")).toBe("BOLIVAR");
    expect(resolveVenezuelanStateCatalogValue("VARGAS")).toBe("LA GUAIRA");
    expect(resolveVenezuelanStateCatalogValue("Distrito Capital")).toBe(
      "DISTRITO CAPITAL",
    );
  });

  it("expone opciones en mayúsculas sin tilde", () => {
    const options = venezuelanStateSelectOptions();
    expect(options.some((o) => o.value === "BOLIVAR" && o.label === "BOLIVAR")).toBe(
      true,
    );
    expect(options.every((o) => o.label === o.value)).toBe(true);
  });
});
