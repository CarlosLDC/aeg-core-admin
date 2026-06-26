import { describe, expect, it } from "vitest";
import { canAccessRoute, defaultPathForRole, resourceForPath } from "@/lib/permissions/routes";
import { FISCAL_BOOK_ENTRY_PATH } from "@/lib/safe-redirect";
import { can } from "@/lib/permissions/can";
import type { Role } from "@/types/user";

describe("route permissions", () => {
  it("maps /settings to dashboard read for ADMIN", () => {
    const resource = resourceForPath("/settings");
    expect(resource).toBe("dashboard");
    expect(can("ADMIN", resource!, "read")).toBe(true);
  });

  it("allows ADMIN to access /users", () => {
    expect(canAccessRoute("ADMIN", "/users")).toBe(true);
  });

  it("denies distributor panel roles from /users", () => {
    expect(canAccessRoute("TECHNICIAN", "/users")).toBe(false);
    expect(canAccessRoute("DISTRIBUTOR", "/users")).toBe(false);
  });

  it("respects nav role restrictions on /mqtt-tests", () => {
    const roles: Role[] = ["ADMIN", "TECHNICIAN", "DISTRIBUTOR"];
    expect(roles.filter((r) => canAccessRoute(r, "/mqtt-tests"))).toEqual(["ADMIN"]);
  });

  it("allows ADMIN on enajenación MQTT docs", () => {
    expect(canAccessRoute("ADMIN", "/docs/enajenacion-mqtt")).toBe(true);
    expect(resourceForPath("/docs/enajenacion-mqtt")).toBe("mqtt");
    expect(canAccessRoute("TECHNICIAN", "/docs/enajenacion-mqtt")).toBe(false);
    expect(canAccessRoute("DISTRIBUTOR", "/docs/enajenacion-mqtt")).toBe(false);
  });

  it("allows distributor panel roles on /branches and legacy client detail redirect", () => {
    for (const role of ["DISTRIBUTOR", "TECHNICIAN"] as const) {
      expect(canAccessRoute(role, "/clients")).toBe(true);
      expect(resourceForPath("/clients")).toBe("branches");
      expect(canAccessRoute(role, "/companies")).toBe(false);
      expect(canAccessRoute(role, "/companies/42")).toBe(true);
    }
  });

  it("allows ADMIN on /companies; legacy /clients is distributor panel only", () => {
    expect(canAccessRoute("ADMIN", "/companies")).toBe(true);
    expect(canAccessRoute("ADMIN", "/clients")).toBe(false);
  });

  it("allows distributor panel roles on client and branch detail routes", () => {
    for (const role of ["DISTRIBUTOR", "TECHNICIAN"] as const) {
      expect(canAccessRoute(role, "/clients/42")).toBe(true);
      expect(canAccessRoute(role, "/branches/99")).toBe(true);
      expect(canAccessRoute(role, "/branches")).toBe(true);
    }
  });

  it("defaults SENIAT to fiscal book entry", () => {
    expect(defaultPathForRole("SENIAT")).toBe(FISCAL_BOOK_ENTRY_PATH);
  });

  it("blocks distributor panel roles from admin-only catalog sections", () => {
    for (const role of ["DISTRIBUTOR", "TECHNICIAN"] as const) {
      expect(canAccessRoute(role, "/printer-models")).toBe(false);
      expect(canAccessRoute(role, "/seals")).toBe(false);
      expect(canAccessRoute(role, "/technical-services")).toBe(false);
      expect(canAccessRoute(role, "/annual-inspections")).toBe(false);
    }
    expect(canAccessRoute("ADMIN", "/printer-models")).toBe(true);
    expect(canAccessRoute("ADMIN", "/seals")).toBe(true);
    expect(canAccessRoute("ADMIN", "/technical-services")).toBe(true);
    expect(canAccessRoute("ADMIN", "/annual-inspections")).toBe(true);
  });

  it("blocks SERVICE_CENTER from panel routes", () => {
    expect(canAccessRoute("SERVICE_CENTER", "/")).toBe(false);
    expect(canAccessRoute("SERVICE_CENTER", "/companies")).toBe(false);
    expect(canAccessRoute("SERVICE_CENTER", "/technical-services")).toBe(false);
  });
});
