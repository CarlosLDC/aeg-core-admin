import { describe, expect, it } from "vitest";
import {
  buildPrinterRollbackConsequences,
  isBackwardPrinterStatusTransition,
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

  it("detects backward status transitions correctly", () => {
    // From enajenada to any other status
    expect(
      isBackwardPrinterStatusTransition({
        currentStatus: "enajenada",
        newStatus: "sin_asignar",
        currentClientId: 1,
        newClientId: null,
      }),
    ).toBe(true);

    expect(
      isBackwardPrinterStatusTransition({
        currentStatus: "enajenada",
        newStatus: "asignada",
        currentClientId: 1,
        newClientId: null,
      }),
    ).toBe(true);

    // From asignada to sin_asignar
    expect(
      isBackwardPrinterStatusTransition({
        currentStatus: "asignada",
        newStatus: "sin_asignar",
        currentDistributorId: 5,
        newDistributorId: null,
      }),
    ).toBe(true);

    // Forward transition (sin_asignar to asignada)
    expect(
      isBackwardPrinterStatusTransition({
        currentStatus: "sin_asignar",
        newStatus: "asignada",
        currentDistributorId: null,
        newDistributorId: 5,
      }),
    ).toBe(false);

    // Same status edit without unassigning
    expect(
      isBackwardPrinterStatusTransition({
        currentStatus: "asignada",
        newStatus: "asignada",
        currentDistributorId: 5,
        newDistributorId: 5,
      }),
    ).toBe(false);
  });

  it("builds consequences list for rollback changes", () => {
    const consequences = buildPrinterRollbackConsequences({
      currentStatus: "enajenada",
      newStatus: "sin_asignar",
      currentClientId: 1,
      clientLabel: "Cliente Principal",
      currentDistributorId: 2,
      distributorLabel: "Distribuidora Caracas",
    });

    expect(consequences).toHaveLength(4);
    expect(consequences[0]).toContain("enajenada");
    expect(consequences[1]).toContain("Cliente Principal");
    expect(consequences[2]).toContain("Distribuidora Caracas");
    expect(consequences[3]).toContain("encabezado/pie");
  });
});

