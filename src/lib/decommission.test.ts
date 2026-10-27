import { describe, expect, it } from "vitest";
import {
  canDecommissionStatus,
  isDecommissionReason,
  validateDecommissionDate,
} from "@/lib/decommission";

describe("decommission helpers", () => {
  it("reconoce motivos válidos", () => {
    expect(isDecommissionReason("PERDIDA")).toBe(true);
    expect(isDecommissionReason("otro")).toBe(false);
  });

  it("no permite desincorporar una impresora ya desincorporada", () => {
    expect(canDecommissionStatus("enajenada")).toBe(true);
    expect(canDecommissionStatus("desincorporada")).toBe(false);
  });

  it("valida la fecha opcional", () => {
    const today = new Date("2026-10-27T12:00:00");
    expect(validateDecommissionDate("", today)).toBeNull();
    expect(validateDecommissionDate("2026-10-27", today)).toBeNull();
    expect(validateDecommissionDate("2026-10-28", today)).toBe(
      "La fecha no puede ser futura.",
    );
    expect(validateDecommissionDate("27/10/2026", today)).toBe(
      "La fecha no es válida.",
    );
  });
});
