import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions/can";
import { canAccessRoute, resourceForPath } from "@/lib/permissions/routes";

describe("can", () => {
  it("allows ADMIN full catalog mutations", () => {
    expect(can("ADMIN", "companies", "delete")).toBe(true);
    expect(can("ADMIN", "contracts", "read")).toBe(true);
  });

  it("allows TECHNICIAN to create/update companies and branches but not delete", () => {
    expect(can("TECHNICIAN", "companies", "create")).toBe(true);
    expect(can("TECHNICIAN", "branches", "create")).toBe(true);
    expect(can("TECHNICIAN", "companies", "update")).toBe(true);
    expect(can("TECHNICIAN", "branches", "update")).toBe(true);
    expect(can("TECHNICIAN", "companies", "delete")).toBe(false);
  });

  it("denies TECHNICIAN users and contracts", () => {
    expect(can("TECHNICIAN", "users", "read")).toBe(false);
    expect(can("TECHNICIAN", "contracts", "read")).toBe(false);
    expect(can("TECHNICIAN", "seals", "create")).toBe(true);
  });

  it("allows non-admin printer read but not mutations", () => {
    expect(can("TECHNICIAN", "printers", "read")).toBe(true);
    expect(can("TECHNICIAN", "printers", "create")).toBe(false);
    expect(can("TECHNICIAN", "printers", "update")).toBe(false);
    expect(can("ADMIN", "printers", "create")).toBe(true);
  });

  it("denies TECHNICIAN printer model catalog access", () => {
    expect(can("TECHNICIAN", "annualInspections", "update")).toBe(false);
    expect(can("TECHNICIAN", "printerModels", "read")).toBe(false);
    expect(can("TECHNICIAN", "printerModels", "create")).toBe(false);
  });

  it("denies TECHNICIAN admin-panel technical services and annual inspections", () => {
    expect(can("TECHNICIAN", "technicalServices", "read")).toBe(false);
    expect(can("TECHNICIAN", "technicalServices", "create")).toBe(false);
    expect(can("TECHNICIAN", "annualInspections", "read")).toBe(false);
    expect(can("TECHNICIAN", "annualInspections", "create")).toBe(false);
    expect(can("ADMIN", "technicalServices", "read")).toBe(true);
    expect(can("ADMIN", "annualInspections", "read")).toBe(true);
  });
});

describe("canAccessRoute", () => {
  it("maps paths to resources", () => {
    expect(resourceForPath("/companies/42")).toBe("companies");
    expect(resourceForPath("/")).toBe("dashboard");
  });

  it("blocks TECHNICIAN from /users", () => {
    expect(canAccessRoute("TECHNICIAN", "/users")).toBe(false);
  });

  it("allows TECHNICIAN dashboard and branches, not companies list", () => {
    expect(canAccessRoute("TECHNICIAN", "/")).toBe(true);
    expect(canAccessRoute("TECHNICIAN", "/branches")).toBe(true);
    expect(canAccessRoute("TECHNICIAN", "/companies")).toBe(false);
  });

  it("blocks TECHNICIAN from contracts", () => {
    expect(canAccessRoute("TECHNICIAN", "/contracts")).toBe(false);
  });

  it("blocks TECHNICIAN from technical services and annual inspections", () => {
    expect(canAccessRoute("TECHNICIAN", "/technical-services")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/technical-services/42")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/annual-inspections")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/annual-inspections/42")).toBe(false);
    expect(canAccessRoute("ADMIN", "/technical-services")).toBe(true);
    expect(canAccessRoute("ADMIN", "/annual-inspections")).toBe(true);
  });

  it("blocks TECHNICIAN from printer models and seals sections", () => {
    expect(canAccessRoute("TECHNICIAN", "/printer-models")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/printer-models/1")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/seals")).toBe(false);
    expect(canAccessRoute("TECHNICIAN", "/seals/1")).toBe(false);
  });
});
