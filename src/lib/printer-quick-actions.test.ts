import { describe, expect, it, vi } from "vitest";
import {
  getPrinterStatusBadgeTitle,
  getPrinterStatusQuickAction,
} from "./printer-quick-actions";
import {
  PRINTER_CONSIGNMENT_PERMISSION_REQUIRED_MESSAGE,
  PRINTER_UNPAID_DISPOSITION_MESSAGE,
} from "./printer-form";
import type { PrinterResponse } from "@/types/printer";

describe("getPrinterStatusQuickAction", () => {
  const handlers = {
    onAssign: vi.fn(),
    onDispose: vi.fn(),
    onGrantDispose: vi.fn(),
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
    expect(action?.kind).toBe("assign");
    expect(action?.buttonLabel).toBe("Asignar");
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
    expect(action?.kind).toBe("dispose");
    expect(action?.buttonLabel).toBe("Enajenar");
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

  it("offers grant_dispose to admin for unauthorized consignment printers", () => {
    const action = getPrinterStatusQuickAction({
      status: "en_consignacion",
      printer: unpaidPrinter,
      isAdmin: true,
      canAssign: false,
      canDispose: true,
      ...handlers,
    });
    expect(action?.kind).toBe("grant_dispose");
    expect(action?.buttonLabel).toBe("Dar permiso");
    expect(action?.label).toBe("Dar permiso para enajenar");
  });

  it("does not offer permission request to distributors on unauthorized consignment printers", () => {
    const action = getPrinterStatusQuickAction({
      status: "en_consignacion",
      printer: { ...unpaidPrinter, pendingEnajenacionRequestId: 55 },
      isAdmin: false,
      canAssign: false,
      canDispose: true,
      ...handlers,
    });
    expect(action).toBeNull();
  });

  it("offers dispose for authorized consignment printers", () => {
    const action = getPrinterStatusQuickAction({
      status: "en_consignacion",
      printer: { ...unpaidPrinter, enajenacionAutorizada: true },
      canAssign: false,
      canDispose: true,
      ...handlers,
    });
    expect(action?.kind).toBe("dispose");
    expect(action?.buttonLabel).toBe("Enajenar");
  });

  it("offers ticket reconfigure when Remoto is pending", () => {
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
    expect(action?.kind).toBe("reconfigure");
    expect(action?.buttonLabel).toBe("Reconfigurar ticket");
    expect(action?.label).toBe("Reconfigurar ticket");
  });

  it("does not offer disposition quick action when printer is already disposed", () => {
    const action = getPrinterStatusQuickAction({
      status: "enajenada",
      printer: {
        ...paidPrinter,
        status: "enajenada",
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

  it("explains consignment permission requirement when not authorized", () => {
    expect(
      getPrinterStatusBadgeTitle({
        status: "en_consignacion",
        printer: unpaidPrinter,
        canDispose: true,
      }),
    ).toBe(PRINTER_CONSIGNMENT_PERMISSION_REQUIRED_MESSAGE);
  });

  it("returns undefined for authorized consignment printers", () => {
    expect(
      getPrinterStatusBadgeTitle({
        status: "en_consignacion",
        printer: { ...unpaidPrinter, enajenacionAutorizada: true },
        canDispose: true,
      }),
    ).toBeUndefined();
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
