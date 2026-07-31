"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getToolsMqttErrorMessage } from "@/lib/tools-mqtt-api";
import {
  areToolsRemoteActionsDisabled,
  areToolsRemoteActionsEnabled,
  areToolsSeniatActionsDisabled,
  areToolsSeniatActionsEnabled,
  getToolsConnectionIssue,
  isToolsPrinterConnectionResolved,
  isToolsPrinterReachable,
  isToolsSeniatOnline,
  mergeToolsCachedNetworkInfo,
  resolveToolsPrinterNetworkInfo,
  shouldPersistToolsNetworkInfo,
  TOOLS_PRINTER_STATUS_TIMEOUT_MESSAGE,
} from "@/lib/tools-printer-connection";
import { createMqttTransport } from "@/modules/tools/transport/mqtt-transport";
import {
  useOptionalToolsTransportContext,
} from "@/modules/tools/transport/tools-transport-provider";
import type { ToolsPrinterTransport } from "@/modules/tools/transport/tools-printer-transport";
import type {
  ToolsMqttAdditionalInfo,
  ToolsMqttStatusResponse,
} from "@/types/tools-mqtt";

export function useToolsPrinterConnection(
  printerId: number | null,
  macAddress: string | null,
) {
  const transportContext = useOptionalToolsTransportContext();
  const fallbackTransport = useMemo(
    () =>
      createMqttTransport(
        printerId ?? 0,
        printerId != null && macAddress != null && macAddress.trim() !== "",
      ),
    [printerId, macAddress],
  );
  const transport: ToolsPrinterTransport =
    transportContext?.transport ?? fallbackTransport;

  const transportReady =
    transportContext?.transportReady ??
    (printerId != null && macAddress != null && macAddress.trim() !== "");
  const usbConnected = transportContext?.usbConnected === true;

  const [status, setStatus] = useState<ToolsMqttStatusResponse | null>(null);
  const [cachedNetworkInfo, setCachedNetworkInfo] =
    useState<ToolsMqttAdditionalInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statusRequestIdRef = useRef(0);

  // Invalidate in-flight status probes when the channel changes. In particular,
  // a pending WiFi/MQTT timeout must not stick after a successful USB connect.
  useEffect(() => {
    statusRequestIdRef.current += 1;
    setLoading(false);
    if (usbConnected) {
      setError(null);
    }
  }, [usbConnected, transport.mode]);

  const refreshStatus = useCallback(async () => {
    if (!transportReady) {
      setError(
        transport.mode === "usb"
          ? "Conecte la impresora por USB."
          : "La impresora no tiene MAC registrada.",
      );
      return;
    }

    const requestId = ++statusRequestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await transport.fetchStatus();
      if (requestId !== statusRequestIdRef.current) {
        return;
      }
      if (!response.success) {
        setError(response.message ?? "No se pudo consultar el estado.");
        setStatus(response);
        return;
      }
      if (shouldPersistToolsNetworkInfo(response.additionalInfo)) {
        setCachedNetworkInfo((previous) =>
          mergeToolsCachedNetworkInfo(previous, response.additionalInfo),
        );
      }
      setStatus(response);
    } catch (err) {
      if (requestId !== statusRequestIdRef.current) {
        return;
      }
      setError(getToolsMqttErrorMessage(err));
    } finally {
      if (requestId === statusRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [transport, transportReady]);

  // USB connection supersedes a remote status timeout immediately (before the
  // effect clears state), so the UI does not keep showing/blocking on it.
  const effectiveError =
    usbConnected && error === TOOLS_PRINTER_STATUS_TIMEOUT_MESSAGE
      ? null
      : error;

  const connectionResolved = isToolsPrinterConnectionResolved(
    loading,
    status,
    effectiveError,
  );
  const isPrinterReachable = isToolsPrinterReachable(status, effectiveError);
  const isSeniatOnline = isToolsSeniatOnline(status, effectiveError);
  const connectionIssue = getToolsConnectionIssue(loading, status, effectiveError);
  const networkInfo = resolveToolsPrinterNetworkInfo(
    status,
    cachedNetworkInfo,
    connectionIssue,
  );
  const remoteActionsEnabled = areToolsRemoteActionsEnabled(
    transportReady,
    loading,
    status,
    effectiveError,
  );
  const remoteActionsDisabled = areToolsRemoteActionsDisabled(
    transportReady,
    loading,
    status,
    effectiveError,
  );
  const seniatActionsEnabled = areToolsSeniatActionsEnabled(
    transportReady,
    loading,
    status,
    effectiveError,
  );
  const seniatActionsDisabled = areToolsSeniatActionsDisabled(
    transportReady,
    loading,
    status,
    effectiveError,
  );

  return {
    status,
    loading,
    error: effectiveError,
    /** @deprecated Use transportReady */
    mqttReady: transportReady,
    transportReady,
    connectionMode: transport.mode,
    refreshStatus,
    connectionResolved,
    /** @deprecated Use connectionResolved */
    connectionKnown: connectionResolved,
    isPrinterReachable,
    isSeniatOnline,
    /** @deprecated Use isSeniatOnline */
    isOnline: isSeniatOnline,
    connectionIssue,
    networkInfo,
    remoteActionsEnabled,
    remoteActionsDisabled,
    seniatActionsEnabled,
    seniatActionsDisabled,
  };
}

export type ToolsPrinterConnectionState = ReturnType<
  typeof useToolsPrinterConnection
>;

/** @deprecated Use useToolsPrinterConnection */
export function useToolsMqtt(printerId: number | null, macAddress: string | null) {
  return useToolsPrinterConnection(printerId, macAddress);
}
