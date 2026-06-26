import { describe, expect, it } from "vitest";
import { canDisposePrinterRecord } from "@/lib/api-permissions";

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
