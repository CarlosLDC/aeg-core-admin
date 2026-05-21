import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions/can";
import { canAccessRoute, resourceForPath } from "@/lib/permissions/routes";

describe("can", () => {
  it("allows ADMIN full catalog mutations", () => {
    expect(can("ADMIN", "companies", "delete")).toBe(true);
    expect(can("ADMIN", "contracts", "read")).toBe(true);
  });

  it("allows DISTRIBUTOR to create/update companies and branches but not delete", () => {
    expect(can("DISTRIBUTOR", "companies", "create")).toBe(true);
    expect(can("DISTRIBUTOR", "branches", "create")).toBe(true);
    expect(can("DISTRIBUTOR", "companies", "update")).toBe(true);
    expect(can("DISTRIBUTOR", "branches", "update")).toBe(true);
    expect(can("DISTRIBUTOR", "companies", "delete")).toBe(false);
  });

  it("allows DISTRIBUTOR to create employees on own branch but not edit catalog", () => {
    expect(can("DISTRIBUTOR", "employees", "create")).toBe(true);
    expect(can("DISTRIBUTOR", "employees", "update")).toBe(false);
    expect(can("DISTRIBUTOR", "employees", "delete")).toBe(false);
    expect(can("DISTRIBUTOR", "employees", "assignRoles")).toBe(true);
  });

  it("denies TECHNICIAN users and contracts", () => {
    expect(can("TECHNICIAN", "users", "read")).toBe(false);
    expect(can("TECHNICIAN", "contracts", "read")).toBe(false);
    expect(can("TECHNICIAN", "seals", "create")).toBe(true);
  });

  it("allows non-admin printer read but not mutations", () => {
    expect(can("TECHNICIAN", "printers", "read")).toBe(true);
    expect(can("TECHNICIAN", "printers", "create")).toBe(false);
    expect(can("DISTRIBUTOR", "printers", "update")).toBe(false);
    expect(can("ADMIN", "printers", "create")).toBe(true);
  });

  it("allows FIELD_OPS on seals and printer model read for printer operators", () => {
    expect(can("SERVICE_CENTER", "annualInspections", "update")).toBe(true);
    expect(can("TECHNICIAN", "printerModels", "read")).toBe(true);
    expect(can("DISTRIBUTOR", "printerModels", "create")).toBe(false);
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

  it("allows DISTRIBUTOR dashboard and clients, not companies nav", () => {
    expect(canAccessRoute("DISTRIBUTOR", "/")).toBe(true);
    expect(canAccessRoute("DISTRIBUTOR", "/clients")).toBe(true);
    expect(canAccessRoute("DISTRIBUTOR", "/companies")).toBe(false);
  });

  it("blocks DISTRIBUTOR from contracts", () => {
    expect(canAccessRoute("DISTRIBUTOR", "/contracts")).toBe(false);
  });

  it("allows TECHNICIAN on printer models catalog; DISTRIBUTOR reads models via impresoras", () => {
    expect(canAccessRoute("TECHNICIAN", "/printer-models")).toBe(true);
    expect(canAccessRoute("DISTRIBUTOR", "/printer-models/1")).toBe(false);
    expect(can("DISTRIBUTOR", "printerModels", "read")).toBe(true);
  });
});
