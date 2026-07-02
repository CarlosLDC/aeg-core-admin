import { describe, expect, it } from "vitest";
import {
  filterAnnualInspectionsInScope,
  filterClientsInScope,
} from "./scope-filters";

describe("filterClientsInScope", () => {
  const clients = [
    { id: 1, branchId: 10 },
    { id: 2, branchId: 20 },
    { id: 3, branchId: 99 },
  ];
  const distributors = [{ id: 7, branchId: 99, createdAt: "" }];

  it("excludes distributor staff branch from client list", () => {
    expect(
      filterClientsInScope(
        clients,
        new Set([10, 20, 99]),
        "DISTRIBUTOR",
        7,
        distributors,
      ),
    ).toEqual([
      { id: 1, branchId: 10 },
      { id: 2, branchId: 20 },
    ]);
  });
});

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

  it("filters distributor and service center roles by printer only when user set is empty", () => {
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

  it("filters service center technicians by scoped printers", () => {
    const printerIds = new Set([10]);
    expect(
      filterAnnualInspectionsInScope(
        rows,
        printerIds,
        new Set(),
        "TECHNICIAN",
      ),
    ).toEqual([
      { id: 1, printerId: 10, userId: 100 },
      { id: 3, printerId: 10, userId: 999 },
    ]);
  });
});
