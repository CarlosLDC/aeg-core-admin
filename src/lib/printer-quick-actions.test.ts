import { describe, expect, it, vi } from "vitest";
import { getPrinterStatusQuickAction } from "./printer-quick-actions";

describe("getPrinterStatusQuickAction", () => {
  const handlers = {
    onAssign: vi.fn(),
    onUnassign: vi.fn(),
    onDispose: vi.fn(),
  };

  it("prioritizes assign for unassigned printers", () => {
    const action = getPrinterStatusQuickAction({
      status: "sin_asignar",
      canAssign: true,
      canUnassign: true,
      canDispose: true,
      ...handlers,
    });
    expect(action?.label).toBe("Asignar impresora");
  });

  it("offers unassign to admin on assigned printers", () => {
    const action = getPrinterStatusQuickAction({
      status: "asignada",
      canAssign: false,
      canUnassign: true,
      canDispose: false,
      ...handlers,
    });
    expect(action?.label).toBe("Desasignar impresora");
  });

  it("offers dispose to distributors on assigned printers", () => {
    const action = getPrinterStatusQuickAction({
      status: "asignada",
      canAssign: false,
      canUnassign: false,
      canDispose: true,
      ...handlers,
    });
    expect(action?.label).toBe("Enajenar impresora");
  });
});
