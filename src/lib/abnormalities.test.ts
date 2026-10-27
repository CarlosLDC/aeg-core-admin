import { describe, expect, it } from "vitest";
import {
  EMPTY_ABNORMALITY_FORM,
  isAbnormalityType,
  toAbnormalityRequest,
} from "@/lib/abnormalities";

describe("abnormalities helpers", () => {
  it("reconoce tipos válidos de anormalidad", () => {
    expect(isAbnormalityType("PRECINTO_ALTERADO")).toBe(true);
    expect(isAbnormalityType("MODIFICACION_FUNCIONAL")).toBe(true);
    expect(isAbnormalityType("invalido")).toBe(false);
  });

  it("exige impresora válida", () => {
    expect(toAbnormalityRequest(EMPTY_ABNORMALITY_FORM)).toBe(
      "Selecciona una impresora válida.",
    );
  });

  it("construye el request con fecha opcional validada", () => {
    const today = new Date("2026-10-27T15:00:00");
    const result = toAbnormalityRequest(
      {
        printerId: "12",
        type: "PRECINTO_REMOVIDO",
        detectedDate: "2026-10-20",
        authorized: false,
        description: " Remoción sin orden ",
      },
      today,
    );
    expect(result).toEqual({
      printerId: 12,
      type: "PRECINTO_REMOVIDO",
      detectedAt: "2026-10-20T12:00:00.000Z",
      authorized: false,
      description: "Remoción sin orden",
    });

    expect(
      toAbnormalityRequest(
        {
          ...EMPTY_ABNORMALITY_FORM,
          printerId: "12",
          detectedDate: "2026-10-28",
        },
        today,
      ),
    ).toBe("La fecha de detección no puede ser futura.");
  });
});
