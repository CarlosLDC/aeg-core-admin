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

  it("allows DISTRIBUTOR on /branches and legacy client detail redirect", () => {
    expect(canAccessRoute("DISTRIBUTOR", "/clients")).toBe(true);
    expect(resourceForPath("/clients")).toBe("branches");
    expect(canAccessRoute("DISTRIBUTOR", "/companies")).toBe(false);
    expect(canAccessRoute("DISTRIBUTOR", "/companies/42")).toBe(true);
  });

  it("blocks TECHNICIAN from panel routes", () => {
    expect(canAccessRoute("TECHNICIAN", "/clients")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/branches")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/")).toBe(false);
  });

  it("allows ADMIN on /companies; legacy /clients is distributor panel only", () => {
    expect(canAccessRoute("ADMIN", "/companies")).toBe(true);
    expect(canAccessRoute("ADMIN", "/clients")).toBe(false);
  });

  it("allows DISTRIBUTOR on client and branch detail routes", () => {
    expect(canAccessRoute("DISTRIBUTOR", "/clients/42")).toBe(true);
    expect(canAccessRoute("DISTRIBUTOR", "/branches/99")).toBe(true);
    expect(canAccessRoute("DISTRIBUTOR", "/branches")).toBe(true);
  });

  it("defaults SENIAT to fiscal book entry", () => {
    expect(defaultPathForRole("SENIAT")).toBe(FISCAL_BOOK_ENTRY_PATH);
  });

  it("blocks panel roles from admin-only catalog sections", () => {
    expect(canAccessRoute("DISTRIBUTOR", "/printer-models")).toBe(false);
    expect(canAccessRoute("DISTRIBUTOR", "/seals")).toBe(false);
    expect(canAccessRoute("DISTRIBUTOR", "/technical-services")).toBe(false);
    expect(canAccessRoute("DISTRIBUTOR", "/annual-inspections")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/printer-models")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/seals")).toBe(false);
    expect(canAccessRoute("ADMIN", "/printer-models")).toBe(true);
    expect(canAccessRoute("ADMIN", "/seals")).toBe(true);
    expect(canAccessRoute("ADMIN", "/technical-services")).toBe(true);
    expect(canAccessRoute("ADMIN", "/annual-inspections")).toBe(true);
  });

  it("blocks service center staff from panel routes", () => {
    expect(canAccessRoute("TECHNICIAN", "/")).toBe(false);
    expect(canAccessRoute("SERVICE_CENTER", "/")).toBe(false);
    expect(canAccessRoute("SERVICE_CENTER", "/companies")).toBe(false);
    expect(canAccessRoute("SERVICE_CENTER", "/technical-services")).toBe(false);
  });
});
