import { describe, expect, it, vi } from "vitest";
import { getPrinterStatusQuickAction } from "./printer-quick-actions";

describe("getPrinterStatusQuickAction", () => {
  const handlers = {
    onAssign: vi.fn(),
    onDispose: vi.fn(),
  };

  it("prioritizes assign for unassigned printers", () => {
    const action = getPrinterStatusQuickAction({
      status: "sin_asignar",
      canAssign: true,
      canDispose: true,
      ...handlers,
    });
    expect(action?.label).toBe("Asignar impresora");
  });

  it("offers dispose to distributors on assigned printers", () => {
    const action = getPrinterStatusQuickAction({
      status: "asignada",
      canAssign: false,
      canDispose: true,
      ...handlers,
    });
    expect(action?.label).toBe("Enajenar impresora");
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
