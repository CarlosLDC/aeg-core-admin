import { describe, expect, it } from "vitest";
import { buildPrinterBoxPages } from "@/lib/printer-box-pages";
import type { InventoryBoxResponse } from "@/types/inventory-box";
import type { PrinterResponse } from "@/types/printer";

function makeBox(boxNumber: number, observations: string | null = null): InventoryBoxResponse {
  return {
    id: boxNumber,
    boxNumber,
    observations,
    createdAt: "2026-11-13T00:00:00Z",
    printerCount: 0,
  };
}

function makePrinter(
  id: number,
  fiscalSerial: string,
  boxId: number | null,
  status: PrinterResponse["status"] = "asignada",
): PrinterResponse {
  return {
    id,
    modelId: 1,
    softwareId: null,
    clientId: null,
    distributorId: null,
    fiscalSerial,
    paid: true,
    installationDate: null,
    versionFirmware: "1.0.0",
    macAddress: null,
    status,
    createdAt: "2026-11-13T00:00:00Z",
    boxId,
    boxNumber: boxId,
    finalSalePrice: null,
    header: null,
    trailer: null,
  };
}

describe("buildPrinterBoxPages", () => {
  it("ordena las hojas por número de caja y los seriales dentro de cada caja", () => {
    const boxes = [makeBox(3, "Estante C"), makeBox(1, "Estante A"), makeBox(2)];
    const printers = [
      makePrinter(1, "GRA0000027", 1, "enajenada"),
      makePrinter(2, "GRA0000020", 1, "asignada"),
      makePrinter(3, "GRA0000002", null, "sin_asignar"),
    ];

    const pages = buildPrinterBoxPages({
      printers,
      boxes,
      hasActiveFilters: false,
    });

    expect(pages.map((p) => p.title)).toEqual([
      "Caja 1",
      "Caja 2",
      "Caja 3",
      "Sin caja asignada",
    ]);
    expect(pages[0].printers.map((p) => p.fiscalSerial)).toEqual([
      "GRA0000020",
      "GRA0000027",
    ]);
    expect(pages[0].serialRange).toBe("GRA0000020 — GRA0000027");
    expect(pages[0].statusCounts).toEqual([
      { status: "asignada", label: "Asignada", count: 1 },
      { status: "enajenada", label: "Enajenada", count: 1 },
    ]);
    expect(pages[1].printers).toHaveLength(0);
    expect(pages[3].printers.map((p) => p.fiscalSerial)).toEqual(["GRA0000002"]);
  });

  it("oculta cajas vacías cuando hay filtros activos", () => {
    const boxes = [makeBox(1), makeBox(2)];
    const printers = [makePrinter(2, "GRA0000020", 1)];

    const pages = buildPrinterBoxPages({
      printers,
      boxes,
      hasActiveFilters: true,
    });

    expect(pages.map((p) => p.title)).toEqual(["Caja 1"]);
  });
});
