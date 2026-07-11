"use client";

import { useCallback, useMemo, useState } from "react";
import { getToolsMqttErrorMessage } from "@/lib/tools-mqtt-api";
import {
  areToolsRemoteActionsDisabled,
  areToolsRemoteActionsEnabled,
  areToolsSeniatActionsDisabled,
  areToolsSeniatActionsEnabled,
  getToolsConnectionIssue,
  hasUsableToolsNetworkInfo,
  isToolsPrinterConnectionResolved,
  isToolsPrinterReachable,
  isToolsSeniatOnline,
  mergeToolsCachedNetworkInfo,
  resolveToolsPrinterNetworkInfo,
  shouldPersistToolsNetworkInfo,
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

  const [status, setStatus] = useState<ToolsMqttStatusResponse | null>(null);
  const [cachedNetworkInfo, setCachedNetworkInfo] =
    useState<ToolsMqttAdditionalInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!transportReady) {
      setError(
        transport.mode === "usb"
          ? "Conecte la impresora por USB."
          : "La impresora no tiene MAC registrada.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await transport.fetchStatus();
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
      setError(getToolsMqttErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [transport, transportReady]);

  const connectionResolved = isToolsPrinterConnectionResolved(
    loading,
    status,
    error,
  );
  const isPrinterReachable = isToolsPrinterReachable(status, error);
  const isSeniatOnline = isToolsSeniatOnline(status, error);
  const connectionIssue = getToolsConnectionIssue(loading, status, error);
  const networkInfo = resolveToolsPrinterNetworkInfo(
    status,
    cachedNetworkInfo,
    connectionIssue,
  );
  const remoteActionsEnabled = areToolsRemoteActionsEnabled(
    transportReady,
    loading,
    status,
    error,
  );
  const remoteActionsDisabled = areToolsRemoteActionsDisabled(
    transportReady,
    loading,
    status,
    error,
  );
  const seniatActionsEnabled = areToolsSeniatActionsEnabled(
    transportReady,
    loading,
    status,
    error,
  );
  const seniatActionsDisabled = areToolsSeniatActionsDisabled(
    transportReady,
    loading,
    status,
    error,
  );

  return {
    status,
    loading,
    error,
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
