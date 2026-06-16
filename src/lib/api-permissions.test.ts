import { describe, expect, it } from "vitest";
import { canDisposePrinterRecord } from "@/lib/api-permissions";

describe("canDisposePrinterRecord", () => {
  it("allows admins and distributors to dispose printers", () => {
    expect(canDisposePrinterRecord("ADMIN")).toBe(true);
    expect(canDisposePrinterRecord("DISTRIBUTOR")).toBe(true);
  });

  it("rejects roles without printer disposition permissions", () => {
    expect(canDisposePrinterRecord("TECHNICIAN")).toBe(false);
  });
});
