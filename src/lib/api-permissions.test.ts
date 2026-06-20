import { describe, expect, it } from "vitest";
import { canDisposePrinterRecord } from "@/lib/api-permissions";

describe("canDisposePrinterRecord", () => {
  it("allows admins and technicians to dispose printers", () => {
    expect(canDisposePrinterRecord("ADMIN")).toBe(true);
    expect(canDisposePrinterRecord("TECHNICIAN")).toBe(true);
  });

  it("rejects SENIAT", () => {
    expect(canDisposePrinterRecord("SENIAT")).toBe(false);
  });
});
