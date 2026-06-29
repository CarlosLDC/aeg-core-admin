import { describe, expect, it } from "vitest";
import {
  DISTRIBUTOR_PRINTER_QUICK_FILTERS,
  DISTRIBUTOR_PRINTER_STATUSES,
  isDistributorPrinterQuickFilter,
} from "./distributor-printer-filters";

describe("distributor printer filters", () => {
  it("limits statuses to consignment, asignada and enajenada", () => {
    expect(DISTRIBUTOR_PRINTER_STATUSES).toEqual([
      "en_consignacion",
      "asignada",
      "enajenada",
    ]);
  });

  it("exposes quick filters for all, consignment, disponibles and vendidas", () => {
    expect(DISTRIBUTOR_PRINTER_QUICK_FILTERS.map((f) => f.label)).toEqual([
      "Todas",
      "En consignación",
      "Disponibles",
      "Vendidas",
    ]);
  });

  it("validates quick filter values", () => {
    expect(isDistributorPrinterQuickFilter("all")).toBe(true);
    expect(isDistributorPrinterQuickFilter("asignada")).toBe(true);
    expect(isDistributorPrinterQuickFilter("sin_asignar")).toBe(false);
  });
});
