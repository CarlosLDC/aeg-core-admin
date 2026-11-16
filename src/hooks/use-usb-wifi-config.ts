"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import type { ToolsWifiNetwork } from "@/types/tools-mqtt";
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

  const [wifiNetworks, setWifiNetworks] = useState<ToolsWifiNetwork[]>([]);
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

  const refreshStatus = useCallback(async () => {
    const session = requireSession();
    setUsbBusy(true);
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
        if (
          wifiNetwork &&
          wifiNetwork !== "N/A" &&
          wifiNetwork.toUpperCase() !== "SIN CONEXION"
        ) {
          setWifiSsid((prev) => prev || wifiNetwork);
        }
      }
    } catch {
      // Optional on uninitialized printers
    } finally {
      setUsbBusy(false);
    }
  }, []);

  const connectUsb = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    setUsbBusy(true);
    setUsbError(null);
    setWifiError(null);
    try {
      await session.requestAndOpen();
      setUsbConnected(true);
      await refreshStatus();
    } catch (err) {
      setUsbConnected(session.isConnected);
      setUsbError(getToolsUsbErrorMessage(err));
    } finally {
      setUsbBusy(false);
    }
  }, [refreshStatus]);

  const disconnectUsb = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    await session.close();
    setUsbConnected(false);
    setStatus({ wifiNetwork: null, ipAddress: null });
    setWifiNetworks([]);
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
      setWifiNetworks(parseWifiScanResponse(item));
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
      await refreshStatus();
    } catch (err) {
      setWifiError(getToolsUsbErrorMessage(err, "Error al configurar Wi-Fi."));
    } finally {
      setWifiConnecting(false);
    }
  }, [refreshStatus, wifiPassword, wifiSsid]);

  return {
    usbSupported,
    usbConnected,
    usbBusy,
    usbError,
    status,
    wifiNetworks,
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
