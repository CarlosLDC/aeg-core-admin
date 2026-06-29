import { describe, expect, it } from "vitest";
import {
  isPrinterAssigned,
  isPrinterAssignedToDistributor,
  isPrinterEligibleForMqttEnajenacion,
  isPrinterOnConsignment,
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
    expect(isPrinterOnConsignment("en_consignacion")).toBe(true);
    expect(isPrinterAssignedToDistributor("en_consignacion")).toBe(true);
    expect(isPrinterAssignedToDistributor("asignada")).toBe(true);
    expect(isPrinterAssignedToDistributor("sin_asignar")).toBe(false);
    expect(isPrinterOperative("sin_asignar")).toBe(true);
    expect(isPrinterOperative("laboratorio")).toBe(false);
  });

  it("detects printers eligible for Remoto enajenacion", () => {
    expect(isPrinterEligibleForMqttEnajenacion("asignada")).toBe(true);
    expect(isPrinterEligibleForMqttEnajenacion("laboratorio")).toBe(true);
    expect(isPrinterEligibleForMqttEnajenacion("de_demostracion")).toBe(true);
    expect(isPrinterEligibleForMqttEnajenacion("sin_asignar")).toBe(false);
    expect(isPrinterEligibleForMqttEnajenacion("en_consignacion")).toBe(false);
    expect(isPrinterEligibleForMqttEnajenacion("enajenada")).toBe(false);
  });
});
