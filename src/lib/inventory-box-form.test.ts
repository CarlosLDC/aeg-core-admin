import { describe, expect, it } from "vitest";
import {
  emptyInventoryBoxForm,
  formatInventoryBoxLabel,
  inventoryBoxToFormValues,
  toInventoryBoxRequest,
} from "@/lib/inventory-box-form";

describe("inventory-box-form", () => {
  it("formatea etiquetas y valores iniciales correctamente", () => {
    expect(formatInventoryBoxLabel(12)).toBe("Caja 12");
    expect(emptyInventoryBoxForm(84)).toEqual({
      boxNumber: "84",
      observations: "",
    });
    expect(
      inventoryBoxToFormValues({
        id: 5,
        boxNumber: 5,
        observations: "Estante A2",
        createdAt: "2026-11-13T00:00:00Z",
        printerCount: 8,
      }),
    ).toEqual({
      boxNumber: "5",
      observations: "Estante A2",
    });
  });

  it("valida y construye payloads de caja", () => {
    expect(
      toInventoryBoxRequest({ boxNumber: "", observations: "" }),
    ).toBe("El número de caja es obligatorio.");
    expect(
      toInventoryBoxRequest({ boxNumber: "0", observations: "" }),
    ).toBe("El número de caja debe ser un entero positivo.");
    expect(
      toInventoryBoxRequest({ boxNumber: "1.5", observations: "" }),
    ).toBe("El número de caja debe ser un entero positivo.");
    expect(
      toInventoryBoxRequest({
        boxNumber: " 84 ",
        observations: "  Lote nuevo  ",
      }),
    ).toEqual({
      boxNumber: 84,
      observations: "Lote nuevo",
    });
    expect(
      toInventoryBoxRequest({
        boxNumber: "84",
        observations: "   ",
      }),
    ).toEqual({
      boxNumber: 84,
      observations: null,
    });
  });
});
