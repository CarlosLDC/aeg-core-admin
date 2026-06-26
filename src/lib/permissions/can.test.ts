import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions/can";
import { canAccessRoute, resourceForPath } from "@/lib/permissions/routes";

describe("can", () => {
  it("allows ADMIN full catalog mutations", () => {
    expect(can("ADMIN", "companies", "delete")).toBe(true);
    expect(can("ADMIN", "contracts", "read")).toBe(true);
  });

  it("allows DISTRIBUTOR and TECHNICIAN panel mutations but not delete", () => {
    for (const role of ["DISTRIBUTOR", "TECHNICIAN"] as const) {
      expect(can(role, "companies", "create")).toBe(true);
      expect(can(role, "branches", "create")).toBe(true);
      expect(can(role, "companies", "update")).toBe(true);
      expect(can(role, "branches", "update")).toBe(true);
      expect(can(role, "companies", "delete")).toBe(false);
      expect(can(role, "users", "read")).toBe(false);
      expect(can(role, "contracts", "read")).toBe(false);
      expect(can(role, "seals", "create")).toBe(true);
      expect(can(role, "printers", "read")).toBe(true);
      expect(can(role, "printers", "create")).toBe(false);
    }
  });

  it("allows field roles to write annual inspections but not read admin panel section", () => {
    for (const role of ["DISTRIBUTOR", "TECHNICIAN", "SERVICE_CENTER"] as const) {
      expect(can(role, "annualInspections", "create")).toBe(true);
      expect(can(role, "annualInspections", "read")).toBe(false);
    }
  });

  it("allows only SERVICE_CENTER and ADMIN to write technical services", () => {
    expect(can("ADMIN", "technicalServices", "create")).toBe(true);
    expect(can("SERVICE_CENTER", "technicalServices", "create")).toBe(true);
    expect(can("DISTRIBUTOR", "technicalServices", "create")).toBe(false);
    expect(can("TECHNICIAN", "technicalServices", "create")).toBe(false);
  });

  it("denies SERVICE_CENTER panel dashboard access", () => {
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

  it("allows DISTRIBUTOR and TECHNICIAN dashboard and branches, not companies list", () => {
    for (const role of ["DISTRIBUTOR", "TECHNICIAN"] as const) {
      expect(canAccessRoute(role, "/")).toBe(true);
      expect(canAccessRoute(role, "/branches")).toBe(true);
      expect(canAccessRoute(role, "/companies")).toBe(false);
      expect(canAccessRoute(role, "/contracts")).toBe(false);
      expect(canAccessRoute(role, "/technical-services")).toBe(false);
      expect(canAccessRoute(role, "/annual-inspections")).toBe(false);
    }
  });
});
