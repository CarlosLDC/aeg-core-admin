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

  it("denies TECHNICIAN from /users", () => {
    expect(canAccessRoute("TECHNICIAN", "/users")).toBe(false);
  });

  it("respects nav role restrictions on /mqtt-tests", () => {
    const roles: Role[] = ["ADMIN", "TECHNICIAN"];
    expect(roles.filter((r) => canAccessRoute(r, "/mqtt-tests"))).toEqual(["ADMIN"]);
  });

  it("allows ADMIN on enajenación MQTT docs", () => {
    expect(canAccessRoute("ADMIN", "/docs/enajenacion-mqtt")).toBe(true);
    expect(resourceForPath("/docs/enajenacion-mqtt")).toBe("mqtt");
    expect(canAccessRoute("TECHNICIAN", "/docs/enajenacion-mqtt")).toBe(false);
  });

  it("allows TECHNICIAN on /clients and denies /companies list", () => {
    expect(canAccessRoute("TECHNICIAN", "/clients")).toBe(true);
    expect(resourceForPath("/clients")).toBe("branches");
    expect(canAccessRoute("TECHNICIAN", "/companies")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/companies/42")).toBe(true);
  });

  it("allows ADMIN on /companies; /clients is TECHNICIAN-only in nav", () => {
    expect(canAccessRoute("ADMIN", "/companies")).toBe(true);
    expect(canAccessRoute("ADMIN", "/clients")).toBe(false);
  });

  it("allows TECHNICIAN on client and branch detail routes", () => {
    expect(canAccessRoute("TECHNICIAN", "/clients/42")).toBe(true);
    expect(canAccessRoute("TECHNICIAN", "/branches/99")).toBe(true);
    expect(canAccessRoute("TECHNICIAN", "/branches")).toBe(true);
  });

  it("defaults SENIAT to fiscal book entry", () => {
    expect(defaultPathForRole("SENIAT")).toBe(FISCAL_BOOK_ENTRY_PATH);
  });

  it("blocks TECHNICIAN from admin-only catalog sections", () => {
    expect(canAccessRoute("TECHNICIAN", "/printer-models")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/seals")).toBe(false);
    expect(canAccessRoute("ADMIN", "/printer-models")).toBe(true);
    expect(canAccessRoute("ADMIN", "/seals")).toBe(true);
  });
});
