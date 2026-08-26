import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions/can";
import { canAccessRoute, resourceForPath } from "@/lib/permissions/routes";

describe("can", () => {
  it("allows ADMIN full catalog mutations", () => {
    expect(can("ADMIN", "companies", "delete")).toBe(true);
    expect(can("ADMIN", "contracts", "read")).toBe(true);
  });

  it("allows DISTRIBUTOR panel mutations but not delete", () => {
    expect(can("DISTRIBUTOR", "companies", "create")).toBe(true);
    expect(can("DISTRIBUTOR", "branches", "create")).toBe(true);
    expect(can("DISTRIBUTOR", "companies", "update")).toBe(true);
    expect(can("DISTRIBUTOR", "branches", "update")).toBe(true);
    expect(can("DISTRIBUTOR", "companies", "delete")).toBe(false);
    expect(can("DISTRIBUTOR", "users", "read")).toBe(false);
    expect(can("DISTRIBUTOR", "contracts", "read")).toBe(false);
    expect(can("DISTRIBUTOR", "seals", "create")).toBe(false);
    expect(can("ADMIN", "seals", "create")).toBe(true);
    expect(can("ADMIN", "seals", "update")).toBe(true);
    expect(can("ADMIN", "seals", "delete")).toBe(true);
    expect(can("DISTRIBUTOR", "printers", "read")).toBe(true);
    expect(can("DISTRIBUTOR", "printers", "create")).toBe(false);
  });

  it("denies TECHNICIAN panel access", () => {
    expect(can("TECHNICIAN", "dashboard", "read")).toBe(false);
    expect(can("TECHNICIAN", "companies", "read")).toBe(false);
    expect(can("TECHNICIAN", "seals", "create")).toBe(false);
  });

  it("allows field roles to write annual inspections but not read admin panel section", () => {
    for (const role of ["DISTRIBUTOR", "TECHNICIAN", "SERVICE_CENTER"] as const) {
      expect(can(role, "annualInspections", "create")).toBe(true);
      expect(can(role, "annualInspections", "read")).toBe(false);
    }
  });

  it("allows ADMIN and TECHNICIAN to write technical services", () => {
    expect(can("ADMIN", "technicalServices", "create")).toBe(true);
    expect(can("TECHNICIAN", "technicalServices", "create")).toBe(true);
    expect(can("SERVICE_CENTER", "technicalServices", "create")).toBe(true);
    expect(can("DISTRIBUTOR", "technicalServices", "create")).toBe(false);
  });

  it("denies service center staff panel dashboard access", () => {
    expect(can("TECHNICIAN", "dashboard", "read")).toBe(false);
    expect(can("SERVICE_CENTER", "dashboard", "read")).toBe(false);
    expect(can("SERVICE_CENTER", "companies", "read")).toBe(false);
  });
});

describe("canAccessRoute", () => {
  it("maps paths to resources", () => {
    expect(resourceForPath("/companies/42")).toBe("companies");
    expect(resourceForPath("/")).toBe("dashboard");
  });

  it("blocks panel roles from /users", () => {
    expect(canAccessRoute("TECHNICIAN", "/users")).toBe(false);
    expect(canAccessRoute("DISTRIBUTOR", "/users")).toBe(false);
  });

  it("allows DISTRIBUTOR dashboard and branches, not TECHNICIAN panel", () => {
    expect(canAccessRoute("DISTRIBUTOR", "/")).toBe(true);
    expect(canAccessRoute("DISTRIBUTOR", "/branches")).toBe(true);
    expect(canAccessRoute("DISTRIBUTOR", "/companies")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/branches")).toBe(false);
  });
});
