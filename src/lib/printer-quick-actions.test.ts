import { describe, expect, it, vi } from "vitest";
import { getPrinterStatusQuickAction } from "./printer-quick-actions";
import type { PrinterResponse } from "@/types/printer";

describe("getPrinterStatusQuickAction", () => {
  const handlers = {
    onAssign: vi.fn(),
    onDispose: vi.fn(),
  };

  const paidPrinter = { paid: true } as PrinterResponse;
  const unpaidPrinter = { paid: false } as PrinterResponse;

  it("prioritizes assign for unassigned printers", () => {
    const action = getPrinterStatusQuickAction({
      status: "sin_asignar",
      canAssign: true,
      canDispose: true,
      ...handlers,
    });
    expect(action?.label).toBe("Asignar impresora");
  });

  it("offers dispose to distributors on assigned paid printers", () => {
    const action = getPrinterStatusQuickAction({
      status: "asignada",
      printer: paidPrinter,
      canAssign: false,
      canDispose: true,
      ...handlers,
    });
    expect(action?.label).toBe("Enajenar impresora");
  });

  it("blocks dispose for unpaid assigned printers", () => {
    const action = getPrinterStatusQuickAction({
      status: "asignada",
      printer: unpaidPrinter,
      canAssign: false,
      canDispose: true,
      ...handlers,
    });
    expect(action).toBeNull();
  });

  it("hides dispose when ticket is saved and MQTT is pending", () => {
    const action = getPrinterStatusQuickAction({
      status: "asignada",
      printer: {
        ...paidPrinter,
        status: "asignada",
        clientId: 10,
        header: { lines: ["ENCABEZADO"] },
      },
      canAssign: false,
      canDispose: true,
      ...handlers,
    });
    expect(action).toBeNull();
  });

  it("returns null when no action is allowed", () => {
    const action = getPrinterStatusQuickAction({
      status: "asignada",
      canAssign: false,
      canDispose: false,
      ...handlers,
    });
    expect(action).toBeNull();
  });
});
