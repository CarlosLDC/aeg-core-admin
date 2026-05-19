import { describe, expect, it } from "vitest";
import { PERMISSION_MATRIX, isPermissionDefined } from "./matrix";
import { ACTIONS, RESOURCES } from "./types";

describe("PERMISSION_MATRIX completeness", () => {
  it("defines read for every resource", () => {
    for (const resource of RESOURCES) {
      expect(
        isPermissionDefined(resource, "read"),
        `missing read on ${resource}`,
      ).toBe(true);
    }
  });

  it("has an entry for each resource key", () => {
    for (const resource of RESOURCES) {
      expect(PERMISSION_MATRIX[resource]).toBeDefined();
    }
  });

  it("only uses assignRoles on employees", () => {
    for (const resource of RESOURCES) {
      if (resource === "employees") continue;
      expect(PERMISSION_MATRIX[resource]?.assignRoles).toBeUndefined();
    }
    expect(PERMISSION_MATRIX.employees?.assignRoles?.length).toBeGreaterThan(0);
  });

  it("covers standard CRUD or documented exceptions", () => {
    const crudExceptions: Partial<Record<(typeof RESOURCES)[number], Action[]>> = {
      dashboard: ["read"],
      mqtt: ["read", "create"],
      seniatExtract: ["read", "create"],
      uploads: ["read", "create"],
    };

    for (const resource of RESOURCES) {
      const allowed = crudExceptions[resource] ?? ACTIONS.filter(
        (a) => a !== "assignRoles",
      );
      for (const action of allowed) {
        expect(
          isPermissionDefined(resource, action),
          `${resource}.${action}`,
        ).toBe(true);
      }
    }
  });
});
