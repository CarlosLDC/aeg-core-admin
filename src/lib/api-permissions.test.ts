import { describe, expect, it } from "vitest";
import { canDisposePrinterRecord } from "@/lib/api-permissions";

describe("canDisposePrinterRecord", () => {
  it("allows admins and distributor panel roles to dispose printers", () => {
    expect(canDisposePrinterRecord("ADMIN")).toBe(true);
    expect(canDisposePrinterRecord("TECHNICIAN")).toBe(true);
    expect(canDisposePrinterRecord("DISTRIBUTOR")).toBe(true);
  });

  it("rejects SENIAT and SERVICE_CENTER", () => {
    expect(canDisposePrinterRecord("SENIAT")).toBe(false);
    expect(canDisposePrinterRecord("SERVICE_CENTER")).toBe(false);
  });
});
