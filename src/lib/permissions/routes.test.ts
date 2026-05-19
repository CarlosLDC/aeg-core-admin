import { describe, expect, it } from "vitest";
import { canAccessRoute, resourceForPath } from "@/lib/permissions/routes";
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

  it("denies SERVICE_CENTER from /users", () => {
    expect(canAccessRoute("SERVICE_CENTER", "/users")).toBe(false);
  });

  it("respects nav role restrictions on /mqtt-tests", () => {
    const roles: Role[] = ["ADMIN", "DISTRIBUTOR", "TECHNICIAN", "SERVICE_CENTER"];
    expect(roles.filter((r) => canAccessRoute(r, "/mqtt-tests"))).toEqual(["ADMIN"]);
  });

  it("allows DISTRIBUTOR on /clients and denies /companies", () => {
    expect(canAccessRoute("DISTRIBUTOR", "/clients")).toBe(true);
    expect(resourceForPath("/clients")).toBe("branches");
    expect(canAccessRoute("DISTRIBUTOR", "/companies")).toBe(false);
  });

  it("allows ADMIN on /companies; /clients is DISTRIBUTOR-only in nav", () => {
    expect(canAccessRoute("ADMIN", "/companies")).toBe(true);
    expect(canAccessRoute("ADMIN", "/clients")).toBe(false);
  });
});
