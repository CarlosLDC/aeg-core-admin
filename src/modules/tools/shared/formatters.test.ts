import { describe, expect, it } from "vitest";
import {
  adaptStatusTerminology,
  countPrintersByStatus,
  filterPrinters,
  filterToolsPrintersByStatus,
  toolsRoleTerminologyKey,
} from "@/modules/tools/shared/formatters";
import type { ToolsPrinter } from "@/modules/tools/shared/types";

const samplePrinter = (overrides: Partial<ToolsPrinter> = {}): ToolsPrinter => ({
  id: 1,
  serial: "ABC1234567",
  macAddress: "AA:BB:CC:DD:EE:FF",
  modelo: "X1",
  marca: "Brand",
  estado: "Enajenada",
  status: "enajenada",
  firmware: "1.0.0",
  ubicacion: "Caracas",
  ciudad: "Caracas",
  rifCliente: "J-123",
  rifName: "Empresa Demo",
  distributorName: "",
  distributorRif: "",
  reporteX: "No disponible",
  clientId: 10,
  clientSummary: null,
  ...overrides,
});

describe("tools formatters", () => {
  it("filters printers by serial and client fields", () => {
    const printers = [
      samplePrinter(),
      samplePrinter({ id: 2, serial: "ZZZ9999999", rifName: "Otra" }),
    ];

    expect(filterPrinters(printers, "abc123")).toHaveLength(1);
    expect(filterPrinters(printers, "empresa demo")).toHaveLength(1);
  });

  it("adapts distributor terminology for non-enajenada statuses", () => {
    expect(
      adaptStatusTerminology("Asignada", toolsRoleTerminologyKey("DISTRIBUTOR")),
    ).toBe("No Enajenada");
    expect(
      adaptStatusTerminology("Asignada", toolsRoleTerminologyKey("ADMIN")),
    ).toBe("Asignada");
  });

  it("counts printers by status buckets", () => {
    const counts = countPrintersByStatus([
      { estado: "Enajenada" },
      { estado: "Sin asignar" },
      { estado: "En consignación" },
      { estado: "Asignada" },
    ]);

    expect(counts).toEqual({
      enajenadas: 1,
      sinAsignar: 1,
      enConsignacion: 1,
      noEnajenadas: 1,
    });
  });

  it("filters printers by status bucket", () => {
    const printers = [
      samplePrinter({ status: "enajenada" }),
      samplePrinter({ id: 2, status: "asignada", estado: "Asignada" }),
      samplePrinter({ id: 3, status: "sin_asignar", estado: "Sin asignar" }),
    ];

    expect(filterToolsPrintersByStatus(printers, "enajenada")).toHaveLength(1);
    expect(filterToolsPrintersByStatus(printers, "no_enajenada")).toHaveLength(1);
    expect(filterToolsPrintersByStatus(printers, "sin_asignar")).toHaveLength(1);
  });
});
