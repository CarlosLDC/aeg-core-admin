import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions/can";
import { canAccessRoute, resourceForPath } from "@/lib/permissions/routes";

describe("can", () => {
  it("allows ADMIN full catalog mutations", () => {
    expect(can("ADMIN", "companies", "delete")).toBe(true);
    expect(can("ADMIN", "contracts", "read")).toBe(true);
  });

  it("allows DISTRIBUTOR to create companies and branches but not delete", () => {
    expect(can("DISTRIBUTOR", "companies", "create")).toBe(true);
    expect(can("DISTRIBUTOR", "branches", "create")).toBe(true);
    expect(can("DISTRIBUTOR", "companies", "delete")).toBe(false);
    expect(can("DISTRIBUTOR", "companies", "update")).toBe(false);
  });

  it("denies TECHNICIAN users and contracts", () => {
    expect(can("TECHNICIAN", "users", "read")).toBe(false);
    expect(can("TECHNICIAN", "contracts", "read")).toBe(false);
    expect(can("TECHNICIAN", "seals", "create")).toBe(true);
  });

  it("allows FIELD_OPS on seals and denies printer model read for TECHNICIAN", () => {
    expect(can("SERVICE_CENTER", "annualInspections", "update")).toBe(true);
    expect(can("TECHNICIAN", "printerModels", "read")).toBe(false);
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

  it("allows DISTRIBUTOR dashboard and companies list", () => {
    expect(canAccessRoute("DISTRIBUTOR", "/")).toBe(true);
    expect(canAccessRoute("DISTRIBUTOR", "/companies")).toBe(true);
  });

  it("blocks DISTRIBUTOR from contracts", () => {
    expect(canAccessRoute("DISTRIBUTOR", "/contracts")).toBe(false);
  });
});
