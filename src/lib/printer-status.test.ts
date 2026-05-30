import { describe, expect, it } from "vitest";
import {
  isPrinterAssigned,
  isPrinterOperative,
  isPrinterUnassigned,
  normalizePrinterStatus,
  printerStatusLabel,
} from "./printer-status";

describe("printer-status", () => {
  it("normalizes legacy inicializada to sin_asignar", () => {
    expect(normalizePrinterStatus("inicializada")).toBe("sin_asignar");
    expect(printerStatusLabel("inicializada")).toBe("Sin asignar");
  });

  it("maps legacy de_demostracion to laboratorio", () => {
    expect(normalizePrinterStatus("de_demostracion")).toBe("laboratorio");
  });

  it("detects assignable and disposable states", () => {
    expect(isPrinterUnassigned("sin_asignar")).toBe(true);
    expect(isPrinterUnassigned("inicializada")).toBe(true);
    expect(isPrinterAssigned("asignada")).toBe(true);
    expect(isPrinterOperative("sin_asignar")).toBe(true);
    expect(isPrinterOperative("laboratorio")).toBe(false);
  });
});
