import { describe, expect, it } from "vitest";
import {
  areToolsRemoteActionsDisabled,
  areToolsRemoteActionsEnabled,
  areToolsSeniatActionsDisabled,
  areToolsSeniatActionsEnabled,
  getToolsConnectionIssue,
  hasUsableToolsNetworkInfo,
  isToolsLegacyBroker,
  isToolsPrinterConnectionResolved,
  isToolsPrinterReachable,
  isToolsSeniatOnline,
  isUsableToolsNetworkField,
  resolveToolsPrinterNetworkInfo,
  resolveToolsStatusBarNotice,
  TOOLS_PRINTER_OFFLINE_MESSAGE,
  TOOLS_PRINTER_STATUS_TIMEOUT_MESSAGE,
  TOOLS_SENIAT_OFFLINE_MESSAGE,
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

const legacyBrokerStatus = {
  success: true,
  seniatStatus: "EN LINEA" as const,
  additionalInfo: printerInfo,
  legacyBroker: true,
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

describe("resolveToolsPrinterNetworkInfo", () => {
  it("prefers current network info and falls back when SENIAT is offline", () => {
    expect(
      resolveToolsPrinterNetworkInfo(seniatOfflineStatus, null, "seniat"),
    ).toEqual(printerInfo);
    expect(
      resolveToolsPrinterNetworkInfo(printerOfflineStatus, printerInfo, "seniat"),
    ).toEqual(printerInfo);
    expect(
      resolveToolsPrinterNetworkInfo(
        legacyBrokerStatus,
        null,
        "legacy-broker",
      ),
    ).toEqual(printerInfo);
    expect(
      resolveToolsPrinterNetworkInfo(printerOfflineStatus, printerInfo, "printer"),
    ).toBeNull();
  });

  it("conserva el SSID en caché cuando la impresora responde con mensaje genérico", () => {
    const genericWifiStatus = {
      success: true,
      seniatStatus: "SIN CONEXION" as const,
      additionalInfo: {
        ...printerInfo,
        wifiNetwork: "EQUIPO SI CONECTADO AP",
      },
    };

    expect(
      resolveToolsPrinterNetworkInfo(genericWifiStatus, printerInfo, "seniat"),
    ).toEqual(printerInfo);
  });

  it("detects usable network fields", () => {
    expect(isUsableToolsNetworkField("192.168.1.10")).toBe(true);
    expect(isUsableToolsNetworkField("N/A")).toBe(false);
    expect(hasUsableToolsNetworkInfo(printerInfo)).toBe(true);
  });
});

describe("isToolsPrinterReachable", () => {
  it("returns true when StaInf includes printer network data", () => {
    expect(isToolsPrinterReachable(onlineStatus, null)).toBe(true);
    expect(isToolsPrinterReachable(legacyBrokerStatus, null)).toBe(true);
    expect(isToolsPrinterReachable(seniatOfflineStatus, null)).toBe(true);
    expect(isToolsPrinterReachable(printerOfflineStatus, null)).toBe(false);
    expect(isToolsPrinterReachable(null, "Sin respuesta")).toBe(false);
    expect(
      isToolsPrinterReachable({ success: false, seniatStatus: "EN LINEA" }, null),
    ).toBe(false);
  });
});

describe("isToolsLegacyBroker", () => {
  it("detects when printer responded via the legacy broker", () => {
    expect(isToolsLegacyBroker(legacyBrokerStatus, null)).toBe(true);
    expect(isToolsLegacyBroker(onlineStatus, null)).toBe(false);
    expect(isToolsLegacyBroker(printerOfflineStatus, null)).toBe(false);
    expect(isToolsLegacyBroker(legacyBrokerStatus, "Error")).toBe(false);
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
  it("distinguishes printer, legacy broker and SENIAT connectivity problems", () => {
    expect(getToolsConnectionIssue(false, onlineStatus, null)).toBe("none");
    expect(getToolsConnectionIssue(false, legacyBrokerStatus, null)).toBe(
      "legacy-broker",
    );
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
  it("requires transport readiness, a finished check and a reachable printer (including legacy broker contingency)", () => {
    expect(areToolsRemoteActionsEnabled(true, true, null, null)).toBe(false);
    expect(areToolsRemoteActionsEnabled(true, false, null, null)).toBe(false);
    expect(
      areToolsRemoteActionsEnabled(true, false, seniatOfflineStatus, null),
    ).toBe(true);
    expect(
      areToolsRemoteActionsEnabled(true, false, legacyBrokerStatus, null),
    ).toBe(true);
    expect(
      areToolsRemoteActionsEnabled(true, false, printerOfflineStatus, null),
    ).toBe(false);
    expect(areToolsRemoteActionsEnabled(true, false, onlineStatus, null)).toBe(
      true,
    );
    expect(areToolsRemoteActionsEnabled(false, false, onlineStatus, null)).toBe(
      false,
    );
    expect(
      areToolsRemoteActionsEnabled(true, true, null, null, true),
    ).toBe(true);
    expect(
      areToolsRemoteActionsEnabled(
        true,
        false,
        printerOfflineStatus,
        "Sin respuesta",
        true,
      ),
    ).toBe(true);
    expect(
      areToolsRemoteActionsEnabled(false, false, null, null, true),
    ).toBe(false);
  });
});

describe("areToolsSeniatActionsEnabled", () => {
  it("requires transport readiness, a finished check and EN LINEA status (including legacy broker contingency)", () => {
    expect(areToolsSeniatActionsEnabled(true, false, seniatOfflineStatus, null)).toBe(
      false,
    );
    expect(areToolsSeniatActionsEnabled(true, false, legacyBrokerStatus, null)).toBe(
      true,
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
      areToolsRemoteActionsDisabled(true, false, legacyBrokerStatus, null),
    ).toBe(false);
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
      areToolsSeniatActionsDisabled(true, false, legacyBrokerStatus, null),
    ).toBe(false);
    expect(
      areToolsSeniatActionsDisabled(true, false, onlineStatus, null),
    ).toBe(false);
  });
});

describe("resolveToolsStatusBarNotice", () => {
  it("returns null while loading or when everything is online", () => {
    expect(
      resolveToolsStatusBarNotice({
        loading: true,
        transportReady: true,
        usbConnected: false,
        connectionResolved: true,
        connectionIssue: "printer",
        error: TOOLS_PRINTER_STATUS_TIMEOUT_MESSAGE,
      }),
    ).toBeNull();

    expect(
      resolveToolsStatusBarNotice({
        loading: false,
        transportReady: true,
        usbConnected: false,
        connectionResolved: true,
        connectionIssue: "none",
        error: null,
      }),
    ).toBeNull();

    expect(
      resolveToolsStatusBarNotice({
        loading: false,
        transportReady: true,
        usbConnected: false,
        connectionResolved: true,
        connectionIssue: "legacy-broker",
        error: null,
      }),
    ).toBeNull();
  });

  it("combines timeout/error cause with remote-impact copy for unreachable printer", () => {
    expect(
      resolveToolsStatusBarNotice({
        loading: false,
        transportReady: true,
        usbConnected: false,
        connectionResolved: true,
        connectionIssue: "printer",
        error: TOOLS_PRINTER_STATUS_TIMEOUT_MESSAGE,
      }),
    ).toEqual({
      tone: "rose",
      kind: "printer-offline",
      message: `${TOOLS_PRINTER_STATUS_TIMEOUT_MESSAGE} Algunas operaciones remotas no podrán ejecutarse hasta restablecer la comunicación.`,
    });

    expect(
      resolveToolsStatusBarNotice({
        loading: false,
        transportReady: true,
        usbConnected: false,
        connectionResolved: true,
        connectionIssue: "printer",
        error: null,
      }),
    ).toEqual({
      tone: "rose",
      kind: "printer-offline",
      message: TOOLS_PRINTER_OFFLINE_MESSAGE,
    });
  });

  it("omits remote-disabled suffix when USB is connected or transport is not ready", () => {
    expect(
      resolveToolsStatusBarNotice({
        loading: false,
        transportReady: true,
        usbConnected: true,
        connectionResolved: true,
        connectionIssue: "printer",
        error: "No se pudo consultar el estado.",
      }),
    ).toEqual({
      tone: "rose",
      kind: "printer-offline",
      message: "No se pudo consultar el estado.",
    });

    expect(
      resolveToolsStatusBarNotice({
        loading: false,
        transportReady: false,
        usbConnected: false,
        connectionResolved: true,
        connectionIssue: "printer",
        error: "La impresora no tiene MAC registrada.",
      }),
    ).toEqual({
      tone: "rose",
      kind: "error",
      message: "La impresora no tiene MAC registrada.",
    });
  });

  it("shows amber notice when printer responds but SENIAT is offline", () => {
    expect(
      resolveToolsStatusBarNotice({
        loading: false,
        transportReady: true,
        usbConnected: false,
        connectionResolved: true,
        connectionIssue: "seniat",
        error: null,
      }),
    ).toEqual({
      tone: "amber",
      kind: "seniat-offline",
      message: TOOLS_SENIAT_OFFLINE_MESSAGE,
    });
  });
});
