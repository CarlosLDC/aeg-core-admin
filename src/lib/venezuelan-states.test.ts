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
    expect(resolveVenezuelanStateCatalogValue("Bolívar")).toBe("Bolívar");
    expect(resolveVenezuelanStateCatalogValue("BOLIVAR")).toBe("Bolívar");
    expect(resolveVenezuelanStateCatalogValue("bolivar")).toBe("Bolívar");
    expect(resolveVenezuelanStateCatalogValue("VARGAS")).toBe("La Guaira");
    expect(resolveVenezuelanStateCatalogValue("Distrito Capital")).toBe(
      "Distrito Capital",
    );
    expect(resolveVenezuelanStateCatalogValue("DISTRITO CAPITAL")).toBe(
      "Distrito Capital",
    );
    expect(resolveVenezuelanStateCatalogValue("TACHIRA")).toBe("Táchira");
    expect(resolveVenezuelanStateCatalogValue("ANZOATEGUI")).toBe("Anzoátegui");
    expect(resolveVenezuelanStateCatalogValue("FALCON")).toBe("Falcón");
    expect(resolveVenezuelanStateCatalogValue("GUARICO")).toBe("Guárico");
    expect(resolveVenezuelanStateCatalogValue("MERIDA")).toBe("Mérida");
  });

  it("expone opciones con capitalización estándar y tildes", () => {
    const options = venezuelanStateSelectOptions();
    expect(options.some((o) => o.value === "Bolívar" && o.label === "Bolívar")).toBe(
      true,
    );
    expect(options.some((o) => o.value === "Táchira" && o.label === "Táchira")).toBe(
      true,
    );
    expect(options.some((o) => o.value === "Anzoátegui" && o.label === "Anzoátegui")).toBe(
      true,
    );
    expect(options.some((o) => o.value === "Distrito Capital" && o.label === "Distrito Capital")).toBe(
      true,
    );
    expect(options.every((o) => o.label === o.value)).toBe(true);
  });
});

