import { describe, expect, it } from "vitest";
import {
  activityResultLabel,
  directionLabel,
} from "@/lib/enajenacion-activity";

describe("enajenacion-activity", () => {
  it("labels directions and results in Spanish", () => {
    expect(directionLabel("INBOUND")).toBe("Entrada");
    expect(directionLabel("OUTBOUND")).toBe("Salida");
    expect(directionLabel(null)).toBe("Sesión");
    expect(activityResultLabel("PROCESSED")).toBe("Procesado");
    expect(activityResultLabel("FAILED")).toBe("Fallido");
  });
});
