import { describe, expect, it } from "vitest";
import { PERMISSION_MATRIX, isPermissionDefined } from "./matrix";
import { ACTIONS, RESOURCES } from "./types";
import type { Action } from "./types";

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

  it("does not use assignRoles on any resource", () => {
    for (const resource of RESOURCES) {
      expect(PERMISSION_MATRIX[resource]?.assignRoles).toBeUndefined();
    }
  });

  it("covers standard CRUD or documented exceptions", () => {
    const crudExceptions: Partial<Record<(typeof RESOURCES)[number], Action[]>> = {
      dashboard: ["read"],
      clientTransfers: ["read", "update"],
      tools: ["read"],
      remoto: ["read", "create"],
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
