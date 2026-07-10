import { describe, expect, it } from "vitest";
import {
  areToolsRemoteActionsDisabled,
  areToolsRemoteActionsEnabled,
  areToolsSeniatActionsDisabled,
  areToolsSeniatActionsEnabled,
  getToolsConnectionIssue,
  isToolsPrinterConnectionResolved,
  isToolsPrinterReachable,
  isToolsSeniatOnline,
} from "@/lib/tools-printer-connection";

const printerInfo = {
  wifiNetwork: "AP_IoT_Home_CANTV",
  ipAddress: "192.168.1.101",
  lastZReport: 2,
  lastZTransmitted: 0,
  daysSinceLastTx: 0,
};

const onlineStatus = {
  success: true,
  seniatStatus: "EN LINEA" as const,
  additionalInfo: printerInfo,
};

const seniatOfflineStatus = {
  success: true,
  seniatStatus: "SIN CONEXION" as const,
  additionalInfo: printerInfo,
};

const printerOfflineStatus = {
  success: true,
  seniatStatus: "SIN CONEXION" as const,
  additionalInfo: null,
};

describe("isToolsPrinterReachable", () => {
  it("returns true when StaInf includes printer network data", () => {
    expect(isToolsPrinterReachable(onlineStatus, null)).toBe(true);
    expect(isToolsPrinterReachable(seniatOfflineStatus, null)).toBe(true);
    expect(isToolsPrinterReachable(printerOfflineStatus, null)).toBe(false);
    expect(isToolsPrinterReachable(null, "Sin respuesta")).toBe(false);
    expect(
      isToolsPrinterReachable({ success: false, seniatStatus: "EN LINEA" }, null),
    ).toBe(false);
  });
});

describe("isToolsSeniatOnline", () => {
  it("returns true only when the printer responds and SENIAT is EN LINEA", () => {
    expect(isToolsSeniatOnline(onlineStatus, null)).toBe(true);
    expect(isToolsSeniatOnline(seniatOfflineStatus, null)).toBe(false);
    expect(isToolsSeniatOnline(printerOfflineStatus, null)).toBe(false);
    expect(isToolsSeniatOnline(null, "Sin respuesta")).toBe(false);
  });
});

describe("getToolsConnectionIssue", () => {
  it("distinguishes printer and SENIAT connectivity problems", () => {
    expect(getToolsConnectionIssue(false, onlineStatus, null)).toBe("none");
    expect(getToolsConnectionIssue(false, seniatOfflineStatus, null)).toBe(
      "seniat",
    );
    expect(getToolsConnectionIssue(false, printerOfflineStatus, null)).toBe(
      "printer",
    );
    expect(getToolsConnectionIssue(true, null, null)).toBe("none");
  });
});

describe("isToolsPrinterConnectionResolved", () => {
  it("stays unresolved while loading and until a response arrives", () => {
    expect(isToolsPrinterConnectionResolved(true, null, null)).toBe(false);
    expect(isToolsPrinterConnectionResolved(false, null, null)).toBe(false);
    expect(isToolsPrinterConnectionResolved(false, seniatOfflineStatus, null)).toBe(
      true,
    );
    expect(isToolsPrinterConnectionResolved(false, null, "Error")).toBe(true);
  });
});

describe("areToolsRemoteActionsEnabled", () => {
  it("requires mqtt readiness, a finished check and a reachable printer", () => {
    expect(areToolsRemoteActionsEnabled(true, true, null, null)).toBe(false);
    expect(areToolsRemoteActionsEnabled(true, false, null, null)).toBe(false);
    expect(
      areToolsRemoteActionsEnabled(true, false, seniatOfflineStatus, null),
    ).toBe(true);
    expect(
      areToolsRemoteActionsEnabled(true, false, printerOfflineStatus, null),
    ).toBe(false);
    expect(areToolsRemoteActionsEnabled(true, false, onlineStatus, null)).toBe(
      true,
    );
  });
});

describe("areToolsSeniatActionsEnabled", () => {
  it("requires mqtt readiness, a finished check and EN LINEA status", () => {
    expect(areToolsSeniatActionsEnabled(true, false, seniatOfflineStatus, null)).toBe(
      false,
    );
    expect(areToolsSeniatActionsEnabled(true, false, onlineStatus, null)).toBe(
      true,
    );
  });
});

describe("areToolsRemoteActionsDisabled", () => {
  it("mirrors the enabled helper", () => {
    expect(areToolsRemoteActionsDisabled(true, true, null, null)).toBe(true);
    expect(
      areToolsRemoteActionsDisabled(true, false, seniatOfflineStatus, null),
    ).toBe(false);
    expect(
      areToolsRemoteActionsDisabled(true, false, onlineStatus, null),
    ).toBe(false);
  });
});

describe("areToolsSeniatActionsDisabled", () => {
  it("mirrors the SENIAT enabled helper", () => {
    expect(
      areToolsSeniatActionsDisabled(true, false, seniatOfflineStatus, null),
    ).toBe(true);
    expect(
      areToolsSeniatActionsDisabled(true, false, onlineStatus, null),
    ).toBe(false);
  });
});
