import { describe, expect, it } from "vitest";
import {
  DISTRIBUTOR_PRINTER_QUICK_FILTERS,
  DISTRIBUTOR_PRINTER_STATUSES,
  isDistributorPrinterQuickFilter,
} from "./distributor-printer-filters";

describe("distributor printer filters", () => {
  it("limits statuses to consignment, asignada, enajenada and a_credito", () => {
    expect(DISTRIBUTOR_PRINTER_STATUSES).toEqual([
      "en_consignacion",
      "asignada",
      "enajenada",
      "a_credito",
    ]);
  });

  it("exposes quick filters for all, consignment, disponibles, vendidas and a credito", () => {
    expect(DISTRIBUTOR_PRINTER_QUICK_FILTERS.map((f) => f.label)).toEqual([
      "Todas",
      "En consignación",
      "Disponibles",
      "Vendidas",
      "A crédito",
    ]);
  });

  it("validates quick filter values", () => {
    expect(isDistributorPrinterQuickFilter("all")).toBe(true);
    expect(isDistributorPrinterQuickFilter("asignada")).toBe(true);
    expect(isDistributorPrinterQuickFilter("sin_asignar")).toBe(false);
  });
});
