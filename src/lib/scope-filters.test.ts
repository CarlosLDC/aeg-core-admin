import { describe, expect, it } from "vitest";
import { filterAnnualInspectionsInScope } from "./scope-filters";

describe("filterAnnualInspectionsInScope", () => {
  const rows = [
    { id: 1, printerId: 10, employeeId: 100 },
    { id: 2, printerId: 20, employeeId: 200 },
    { id: 3, printerId: 10, employeeId: 999 },
  ];

  it("returns all rows for ADMIN", () => {
    expect(
      filterAnnualInspectionsInScope(rows, new Set(), new Set(), "ADMIN"),
    ).toEqual(rows);
  });

  it("filters DISTRIBUTOR by printer only", () => {
    const printerIds = new Set([10]);
    const employeeIds = new Set([999]);
    expect(
      filterAnnualInspectionsInScope(
        rows,
        printerIds,
        employeeIds,
        "DISTRIBUTOR",
      ),
    ).toEqual([
      { id: 1, printerId: 10, employeeId: 100 },
      { id: 3, printerId: 10, employeeId: 999 },
    ]);
  });

  it("filters TECHNICIAN by printer and employee", () => {
    const printerIds = new Set([10]);
    const employeeIds = new Set([100]);
    expect(
      filterAnnualInspectionsInScope(
        rows,
        printerIds,
        employeeIds,
        "TECHNICIAN",
      ),
    ).toEqual([{ id: 1, printerId: 10, employeeId: 100 }]);
  });
});
