import { describe, expect, it, vi } from "vitest";
import {
  getPrinterStatusBadgeTitle,
  getPrinterStatusQuickAction,
} from "./printer-quick-actions";
import { PRINTER_UNPAID_DISPOSITION_MESSAGE } from "./printer-form";
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

  it("blocks dispose for printers on consignment", () => {
    const action = getPrinterStatusQuickAction({
      status: "en_consignacion",
      printer: unpaidPrinter,
      canAssign: false,
      canDispose: true,
      ...handlers,
    });
    expect(action).toBeNull();
  });

  it("offers ticket reconfigure when MQTT is pending", () => {
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
    expect(action?.label).toBe("Reconfigurar ticket");
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

describe("getPrinterStatusBadgeTitle", () => {
  const unpaidPrinter = { paid: false } as PrinterResponse;

  it("explains why unpaid assigned printers cannot be disposed", () => {
    expect(
      getPrinterStatusBadgeTitle({
        status: "asignada",
        printer: unpaidPrinter,
        canDispose: true,
      }),
    ).toBe(PRINTER_UNPAID_DISPOSITION_MESSAGE);
  });

  it("explains why consignment printers cannot be disposed", () => {
    expect(
      getPrinterStatusBadgeTitle({
        status: "en_consignacion",
        printer: unpaidPrinter,
        canDispose: true,
      }),
    ).toBe(PRINTER_UNPAID_DISPOSITION_MESSAGE);
  });

  it("returns undefined for paid assigned printers", () => {
    expect(
      getPrinterStatusBadgeTitle({
        status: "asignada",
        printer: { paid: true } as PrinterResponse,
        canDispose: true,
      }),
    ).toBeUndefined();
  });
});
