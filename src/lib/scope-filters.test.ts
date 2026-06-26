import { describe, expect, it } from "vitest";
import { filterAnnualInspectionsInScope } from "./scope-filters";

describe("filterAnnualInspectionsInScope", () => {
  const rows = [
    { id: 1, printerId: 10, userId: 100 },
    { id: 2, printerId: 20, userId: 200 },
    { id: 3, printerId: 10, userId: 999 },
  ];

  it("returns all rows for ADMIN", () => {
    expect(
      filterAnnualInspectionsInScope(rows, new Set(), new Set(), "ADMIN"),
    ).toEqual(rows);
  });

  it("filters distributor panel roles by printer only when user set is empty", () => {
    const printerIds = new Set([10]);
    for (const role of ["DISTRIBUTOR", "TECHNICIAN"] as const) {
      expect(
        filterAnnualInspectionsInScope(
          rows,
          printerIds,
          new Set(),
          role,
        ),
      ).toEqual([
        { id: 1, printerId: 10, userId: 100 },
        { id: 3, printerId: 10, userId: 999 },
      ]);
    }
  });

  it("filters distributor panel roles by scoped printers", () => {
    const printerIds = new Set([10]);
    const userIds = new Set([100]);
    expect(
      filterAnnualInspectionsInScope(
        rows,
        printerIds,
        userIds,
        "TECHNICIAN",
      ),
    ).toEqual([
      { id: 1, printerId: 10, userId: 100 },
      { id: 3, printerId: 10, userId: 999 },
    ]);
  });
});
