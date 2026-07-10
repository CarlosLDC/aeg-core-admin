import { describe, expect, it } from "vitest";
import {
  areToolsRemoteActionsDisabled,
  areToolsRemoteActionsEnabled,
  isToolsPrinterConnectionResolved,
  isToolsPrinterOnline,
} from "@/lib/tools-printer-connection";

const onlineStatus = { success: true, seniatStatus: "EN LINEA" as const };
const offlineStatus = { success: true, seniatStatus: "SIN CONEXION" as const };

describe("isToolsPrinterOnline", () => {
  it("returns true only when SENIAT reports EN LINEA without errors", () => {
    expect(isToolsPrinterOnline(onlineStatus, null)).toBe(true);
    expect(isToolsPrinterOnline(offlineStatus, null)).toBe(false);
    expect(isToolsPrinterOnline(null, "Sin respuesta")).toBe(false);
    expect(
      isToolsPrinterOnline({ success: false, seniatStatus: "EN LINEA" }, null),
    ).toBe(false);
  });
});

describe("isToolsPrinterConnectionResolved", () => {
  it("stays unresolved while loading and until a response arrives", () => {
    expect(isToolsPrinterConnectionResolved(true, null, null)).toBe(false);
    expect(isToolsPrinterConnectionResolved(false, null, null)).toBe(false);
    expect(isToolsPrinterConnectionResolved(false, offlineStatus, null)).toBe(true);
    expect(isToolsPrinterConnectionResolved(false, null, "Error")).toBe(true);
  });
});

describe("areToolsRemoteActionsEnabled", () => {
  it("requires mqtt readiness, a finished check and EN LINEA status", () => {
    expect(
      areToolsRemoteActionsEnabled(true, true, null, null),
    ).toBe(false);
    expect(
      areToolsRemoteActionsEnabled(true, false, null, null),
    ).toBe(false);
    expect(
      areToolsRemoteActionsEnabled(true, false, offlineStatus, null),
    ).toBe(false);
    expect(
      areToolsRemoteActionsEnabled(true, false, onlineStatus, null),
    ).toBe(true);
    expect(
      areToolsRemoteActionsEnabled(false, false, onlineStatus, null),
    ).toBe(false);
  });
});

describe("areToolsRemoteActionsDisabled", () => {
  it("mirrors the enabled helper", () => {
    expect(
      areToolsRemoteActionsDisabled(true, true, null, null),
    ).toBe(true);
    expect(
      areToolsRemoteActionsDisabled(true, false, onlineStatus, null),
    ).toBe(false);
  });
});
