"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeToolsWifiNetworks,
  parseToolsWifiConnection,
  resolveToolsWifiConnectedSsid,
} from "@/lib/tools-wifi-networks";
import {
  buildStatusPayload,
  buildWifiConnectPayload,
  buildWifiScanPayload,
} from "@/modules/tools/serial/tools-command-builder";
import {
  CMD_STA_INF,
  CMD_WIFI_CONF,
  TOOLS_SERIAL_TIMEOUT_MS,
} from "@/modules/tools/serial/tools-serial-constants";
import { cmdEquals } from "@/modules/tools/serial/tools-fiscal-response";
import {
  isStatusResponse,
  isWifiScanResponse,
  parseStatusResponse,
  parseWifiConnectResponse,
  parseWifiScanResponse,
} from "@/modules/tools/serial/tools-response-parser";
import {
  getToolsUsbErrorMessage,
  isWebSerialSupported,
  ToolsSerialPortSession,
} from "@/modules/tools/serial/tools-serial-port";
import type { ToolsWifiNetwork } from "@/types/tools-mqtt";

export type UsbWifiStatus = {
  wifiNetwork: string | null;
  ipAddress: string | null;
};

/**
 * Manages a Web Serial USB connection to configure Wi-Fi on a fiscal printer.
 */
export function useUsbWifiConfig() {
  const sessionRef = useRef<ToolsSerialPortSession | null>(null);
  const [usbSupported] = useState(() => isWebSerialSupported());
  const [usbConnected, setUsbConnected] = useState(false);
  const [usbBusy, setUsbBusy] = useState(false);
  const [usbError, setUsbError] = useState<string | null>(null);

  const [status, setStatus] = useState<UsbWifiStatus>({
    wifiNetwork: null,
    ipAddress: null,
  });

  const [rawWifiNetworks, setRawWifiNetworks] = useState<ToolsWifiNetwork[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [wifiScanning, setWifiScanning] = useState(false);
  const [wifiConnecting, setWifiConnecting] = useState(false);
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiMessage, setWifiMessage] = useState<string | null>(null);
  const [wifiError, setWifiError] = useState<string | null>(null);

  useEffect(() => {
    const session = new ToolsSerialPortSession();
    sessionRef.current = session;
    return () => {
      void session.close();
    };
  }, []);

  const requireSession = (): ToolsSerialPortSession => {
    const session = sessionRef.current;
    if (!session || !session.isConnected) {
      throw new Error("Conecte la impresora por USB primero.");
    }
    return session;
  };

  const readStatusFromSession = useCallback(async () => {
    const session = requireSession();
    try {
      const statusItem = await session.publishAndAwaitMatcher(
        buildStatusPayload(),
        (item) =>
          item != null &&
          (cmdEquals(item.cmd, CMD_STA_INF) || isStatusResponse(item)),
        TOOLS_SERIAL_TIMEOUT_MS.status,
      );
      if (isStatusResponse(statusItem)) {
        const parsed = parseStatusResponse(statusItem);
        const wifiNetwork = parsed.additionalInfo?.wifiNetwork ?? null;
        const ipAddress = parsed.additionalInfo?.ipAddress ?? null;
        setStatus({ wifiNetwork, ipAddress });

        const resolvedSsid = resolveToolsWifiConnectedSsid(wifiNetwork);
        if (resolvedSsid) {
          setWifiSsid((prev) => prev || resolvedSsid);
        }
      }
    } catch {
      // Optional on uninitialized printers
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    setUsbBusy(true);
    try {
      await readStatusFromSession();
    } finally {
      setUsbBusy(false);
    }
  }, [readStatusFromSession]);

  const connectUsb = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    setUsbBusy(true);
    setUsbError(null);
    setWifiError(null);
    try {
      await session.requestAndOpen();
      setUsbConnected(true);
      await readStatusFromSession();
    } catch (err) {
      setUsbConnected(session.isConnected);
      setUsbError(getToolsUsbErrorMessage(err));
    } finally {
      setUsbBusy(false);
    }
  }, [readStatusFromSession]);

  const disconnectUsb = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    await session.close();
    setUsbConnected(false);
    setStatus({ wifiNetwork: null, ipAddress: null });
    setRawWifiNetworks([]);
    setHasScanned(false);
    setWifiMessage(null);
    setWifiError(null);
  }, []);

  const scanWifi = useCallback(async () => {
    setWifiError(null);
    setWifiMessage(null);
    try {
      const session = requireSession();
      setWifiScanning(true);
      const item = await session.publishAndAwaitMatcher(
        buildWifiScanPayload(),
        isWifiScanResponse,
        TOOLS_SERIAL_TIMEOUT_MS.wifiScan,
      );
      setRawWifiNetworks(parseWifiScanResponse(item));
      setHasScanned(true);
    } catch (err) {
      setWifiError(
        getToolsUsbErrorMessage(err, "No se pudieron escanear las redes Wi-Fi."),
      );
    } finally {
      setWifiScanning(false);
    }
  }, []);

  const connectWifi = useCallback(async () => {
    const trimmedSsid = wifiSsid.trim();
    if (!trimmedSsid) {
      setWifiError("Seleccione o escriba el SSID de la red Wi-Fi.");
      return;
    }
    setWifiError(null);
    setWifiMessage(null);
    try {
      const session = requireSession();
      setWifiConnecting(true);
      const item = await session.publishAndAwaitObject(
        buildWifiConnectPayload(trimmedSsid, wifiPassword),
        CMD_WIFI_CONF,
        TOOLS_SERIAL_TIMEOUT_MS.wifi,
      );
      parseWifiConnectResponse(item);
      const reportedIp =
        item.dataS && typeof item.dataS === "string" && item.dataS.trim() !== ""
          ? item.dataS.trim()
          : null;
      if (reportedIp) {
        setStatus({
          wifiNetwork: trimmedSsid,
          ipAddress: reportedIp,
        });
      }
      setWifiMessage(
        reportedIp
          ? `Conectado a ${trimmedSsid} (IP: ${reportedIp}).`
          : `Red ${trimmedSsid} configurada. Verificando estado…`,
      );
      await readStatusFromSession();
    } catch (err) {
      setWifiError(getToolsUsbErrorMessage(err, "Error al configurar Wi-Fi."));
    } finally {
      setWifiConnecting(false);
    }
  }, [readStatusFromSession, wifiPassword, wifiSsid]);

  const wifiConnection = useMemo(
    () => parseToolsWifiConnection(status.wifiNetwork),
    [status.wifiNetwork],
  );

  const connectedSsid = wifiConnection.ssid ?? "";

  const wifiNetworks = useMemo(
    () =>
      normalizeToolsWifiNetworks(rawWifiNetworks, connectedSsid || undefined),
    [rawWifiNetworks, connectedSsid],
  );

  return {
    usbSupported,
    usbConnected,
    usbBusy,
    usbError,
    status,
    wifiConnection,
    connectedSsid,
    wifiNetworks,
    hasScanned,
    wifiScanning,
    wifiConnecting,
    wifiSsid,
    setWifiSsid,
    wifiPassword,
    setWifiPassword,
    wifiMessage,
    wifiError,
    connectUsb,
    disconnectUsb,
    refreshStatus,
    scanWifi,
    connectWifi,
  };
}

export type UsbWifiConfigState = ReturnType<typeof useUsbWifiConfig>;
