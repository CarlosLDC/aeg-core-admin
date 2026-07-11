"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ToolsSerialPortSession, isWebSerialSupported } from "@/modules/tools/serial/tools-serial-port";
import { createMqttTransport } from "@/modules/tools/transport/mqtt-transport";
import { createUsbSerialTransport } from "@/modules/tools/transport/usb-serial-transport";
import type {
  ToolsConnectionMode,
  ToolsPrinterTransport,
} from "@/modules/tools/transport/tools-printer-transport";

const MODE_STORAGE_PREFIX = "tools-connection-mode:";

type ToolsTransportContextValue = {
  mode: ToolsConnectionMode;
  setMode: (mode: ToolsConnectionMode) => void;
  transport: ToolsPrinterTransport;
  usbConnected: boolean;
  usbConnecting: boolean;
  usbError: string | null;
  webSerialSupported: boolean;
  connectUsb: () => Promise<void>;
  disconnectUsb: () => Promise<void>;
  transportReady: boolean;
  macRequired: boolean;
};

const ToolsTransportContext = createContext<ToolsTransportContextValue | null>(null);

function readStoredMode(_serial: string): ToolsConnectionMode {
  // USB requires a fresh user gesture; always start on the remote channel.
  return "wifi";
}

type ToolsTransportProviderProps = {
  printerSerial: string;
  printerId: number | null;
  macAddress: string | null;
  children: ReactNode;
};

export function ToolsTransportProvider({
  printerSerial,
  printerId,
  macAddress,
  children,
}: ToolsTransportProviderProps) {
  const [mode, setModeState] = useState<ToolsConnectionMode>(() =>
    readStoredMode(printerSerial),
  );
  const [usbConnected, setUsbConnected] = useState(false);
  const [usbConnecting, setUsbConnecting] = useState(false);
  const [usbError, setUsbError] = useState<string | null>(null);
  const sessionRef = useRef(new ToolsSerialPortSession());
  const webSerialSupported = isWebSerialSupported();

  const setMode = useCallback(
    (nextMode: ToolsConnectionMode) => {
      if (nextMode === "usb" && !webSerialSupported) {
        return;
      }
      setModeState(nextMode);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`${MODE_STORAGE_PREFIX}${printerSerial}`, nextMode);
      }
    },
    [printerSerial, webSerialSupported],
  );

  useEffect(() => {
    setModeState(readStoredMode(printerSerial));
  }, [printerSerial]);

  useEffect(() => {
    return () => {
      void sessionRef.current.close();
    };
  }, []);

  const connectUsb = useCallback(async () => {
    setUsbConnecting(true);
    setUsbError(null);
    try {
      await sessionRef.current.requestAndOpen();
      setUsbConnected(true);
      setModeState("usb");
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`${MODE_STORAGE_PREFIX}${printerSerial}`, "usb");
      }
    } catch (error) {
      setUsbConnected(false);
      setUsbError(error instanceof Error ? error.message : "No se pudo conectar por USB.");
      throw error;
    } finally {
      setUsbConnecting(false);
    }
  }, [printerSerial]);

  const disconnectUsb = useCallback(async () => {
    await sessionRef.current.close();
    setUsbConnected(false);
    setUsbError(null);
    setModeState("wifi");
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(`${MODE_STORAGE_PREFIX}${printerSerial}`, "wifi");
    }
  }, [printerSerial]);

  const macReady =
    printerId != null && macAddress != null && macAddress.trim() !== "";

  const transport = useMemo<ToolsPrinterTransport>(() => {
    if (mode === "usb") {
      return createUsbSerialTransport(sessionRef.current);
    }
    if (printerId == null) {
      return createMqttTransport(0, false);
    }
    return createMqttTransport(printerId, macReady);
  }, [mode, printerId, macReady, usbConnected]);

  const transportReady =
    mode === "usb" ? usbConnected : macReady;

  const macRequired = mode === "wifi";

  const value = useMemo<ToolsTransportContextValue>(
    () => ({
      mode,
      setMode,
      transport,
      usbConnected,
      usbConnecting,
      usbError,
      webSerialSupported,
      connectUsb,
      disconnectUsb,
      transportReady,
      macRequired,
    }),
    [
      mode,
      setMode,
      transport,
      usbConnected,
      usbConnecting,
      usbError,
      webSerialSupported,
      connectUsb,
      disconnectUsb,
      transportReady,
      macRequired,
    ],
  );

  return (
    <ToolsTransportContext.Provider value={value}>
      {children}
    </ToolsTransportContext.Provider>
  );
}

export function useToolsTransportContext(): ToolsTransportContextValue {
  const context = useContext(ToolsTransportContext);
  if (context == null) {
    throw new Error("useToolsTransportContext must be used within ToolsTransportProvider");
  }
  return context;
}

export function useOptionalToolsTransportContext(): ToolsTransportContextValue | null {
  return useContext(ToolsTransportContext);
}

export function useToolsTransport(): ToolsPrinterTransport {
  return useToolsTransportContext().transport;
}
