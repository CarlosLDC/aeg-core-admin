import { describe, expect, it } from "vitest";
import {
  DISPOSITION_WIZARD_STEPS,
  resolveDispositionInitialStep,
  resolveDispositionPreviousStep,
  resolveDispositionStepSubtitle,
  resolveDispositionSubmitLabel,
} from "@/lib/printer-disposition-wizard";

describe("printer-disposition-wizard", () => {
  it("defines the 4 steps in the expected order", () => {
    expect(DISPOSITION_WIZARD_STEPS).toEqual([
      { step: 1, label: "Cliente" },
      { step: 2, label: "Factura" },
      { step: 3, label: "Encabezado y pie" },
      { step: 4, label: "Wi-Fi (opcional)" },
    ]);
  });

  it("starts on step 2 only when reconfiguring with an assigned client", () => {
    expect(resolveDispositionInitialStep({ clientId: null }, false)).toBe(1);
    expect(resolveDispositionInitialStep({ clientId: 12 }, false)).toBe(1);
    expect(resolveDispositionInitialStep({ clientId: null }, true)).toBe(1);
    expect(resolveDispositionInitialStep({ clientId: 12 }, true)).toBe(2);
  });

  it("navigates backwards through steps 4 -> 3 -> 2 -> 1 -> null", () => {
    expect(resolveDispositionPreviousStep(4)).toBe(3);
    expect(resolveDispositionPreviousStep(3)).toBe(2);
    expect(resolveDispositionPreviousStep(2)).toBe(1);
    expect(resolveDispositionPreviousStep(1)).toBeNull();
  });

  it("returns contextual subtitles for initial and reconfigure flows", () => {
    expect(resolveDispositionStepSubtitle(1, false)).toContain("Selecciona el cliente");
    expect(resolveDispositionStepSubtitle(1, true)).toContain("Confirma el cliente");
    expect(resolveDispositionStepSubtitle(2, false)).toContain("Ingresa el número de factura");
    expect(resolveDispositionStepSubtitle(2, true)).toContain("Confirma o actualiza el número de factura");
    expect(resolveDispositionStepSubtitle(3, false)).toContain("encabezado y pie de ticket de la enajenación");
    expect(resolveDispositionStepSubtitle(3, true)).toContain("antes de guardar");
    expect(resolveDispositionStepSubtitle(4, false)).toContain("Wi-Fi por USB");
    expect(resolveDispositionStepSubtitle(4, true)).toContain("Wi-Fi por USB");
  });

  it("computes submit button labels across steps and modes", () => {
    for (const step of [1, 2, 3] as const) {
      expect(
        resolveDispositionSubmitLabel({
          step,
          isReconfiguringTicket: false,
          wifiTouched: false,
        }),
      ).toBe("Siguiente");
      expect(
        resolveDispositionSubmitLabel({
          step,
          isReconfiguringTicket: true,
          wifiTouched: true,
        }),
      ).toBe("Siguiente");
    }

    expect(
      resolveDispositionSubmitLabel({
        step: 4,
        isReconfiguringTicket: false,
        wifiTouched: false,
      }),
    ).toBe("Omitir y confirmar");
    expect(
      resolveDispositionSubmitLabel({
        step: 4,
        isReconfiguringTicket: false,
        wifiTouched: true,
      }),
    ).toBe("Confirmar enajenación");
    expect(
      resolveDispositionSubmitLabel({
        step: 4,
        isReconfiguringTicket: true,
        wifiTouched: false,
      }),
    ).toBe("Omitir y guardar");
    expect(
      resolveDispositionSubmitLabel({
        step: 4,
        isReconfiguringTicket: true,
        wifiTouched: true,
      }),
    ).toBe("Guardar cambios");
  });
});
