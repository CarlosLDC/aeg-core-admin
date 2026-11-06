import { describe, expect, it } from "vitest";
import {
  canAssignPrinterSoftware,
  canDisposePrinterRecord,
  canModifyPrinterRecord,
  canDeletePrinterRecord,
} from "@/lib/api-permissions";
import { can } from "@/lib/permissions/can";

describe("canDisposePrinterRecord", () => {
  it("allows admins and distributors to dispose printers", () => {
    expect(canDisposePrinterRecord("ADMIN")).toBe(true);
    expect(canDisposePrinterRecord("DISTRIBUTOR")).toBe(true);
  });

  it("rejects SENIAT, service center technicians and legacy SERVICE_CENTER", () => {
    expect(canDisposePrinterRecord("SENIAT")).toBe(false);
    expect(canDisposePrinterRecord("TECHNICIAN")).toBe(false);
    expect(canDisposePrinterRecord("SERVICE_CENTER")).toBe(false);
  });
});

describe("printer update permissions", () => {
  it("restricts printer modification to admin only", () => {
    expect(canModifyPrinterRecord("ADMIN")).toBe(true);
    expect(canModifyPrinterRecord("DISTRIBUTOR")).toBe(false);
  });

  it("allows only distributor to assign software via dedicated action", () => {
    expect(canAssignPrinterSoftware("ADMIN")).toBe(false);
    expect(canAssignPrinterSoftware("DISTRIBUTOR")).toBe(true);
  });

  it("restricts printer deletion to admin only", () => {
    expect(canDeletePrinterRecord("ADMIN")).toBe(true);
    expect(canDeletePrinterRecord("DISTRIBUTOR")).toBe(false);
  });

  it("allows distributor to read software", () => {
    expect(can("DISTRIBUTOR", "software", "read")).toBe(true);
    expect(can("ADMIN", "software", "read")).toBe(true);
    expect(can("DISTRIBUTOR", "software", "create")).toBe(false);
  });
});
