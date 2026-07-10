"use client";

import { useCallback, useState } from "react";
import { fetchToolsMqttStatus, getToolsMqttErrorMessage } from "@/lib/tools-mqtt-api";
import type { ToolsMqttStatusResponse } from "@/types/tools-mqtt";
import {
  areToolsRemoteActionsDisabled,
  areToolsRemoteActionsEnabled,
  isToolsPrinterConnectionResolved,
  isToolsPrinterOnline,
} from "./tools-printer-connection";

export function useToolsMqtt(printerId: number | null, macAddress: string | null) {
  const [status, setStatus] = useState<ToolsMqttStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mqttReady = printerId != null && macAddress != null && macAddress.trim() !== "";

  const refreshStatus = useCallback(async () => {
    if (!mqttReady || printerId == null) {
      setError("La impresora no tiene MAC registrada.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchToolsMqttStatus(printerId);
      if (!response.success) {
        setError(response.message ?? "No se pudo consultar el estado.");
        setStatus(response);
        return;
      }
      setStatus(response);
    } catch (err) {
      setError(getToolsMqttErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [mqttReady, printerId]);

  return {
    status,
    loading,
    error,
    mqttReady,
    refreshStatus,
  };
}

export function useToolsPrinterConnection(
  printerId: number | null,
  macAddress: string | null,
) {
  const mqtt = useToolsMqtt(printerId, macAddress);
  const connectionResolved = isToolsPrinterConnectionResolved(
    mqtt.loading,
    mqtt.status,
    mqtt.error,
  );
  const isOnline = isToolsPrinterOnline(mqtt.status, mqtt.error);
  const remoteActionsEnabled = areToolsRemoteActionsEnabled(
    mqtt.mqttReady,
    mqtt.loading,
    mqtt.status,
    mqtt.error,
  );
  const remoteActionsDisabled = areToolsRemoteActionsDisabled(
    mqtt.mqttReady,
    mqtt.loading,
    mqtt.status,
    mqtt.error,
  );

  return {
    ...mqtt,
    connectionResolved,
    /** @deprecated Use connectionResolved */
    connectionKnown: connectionResolved,
    isOnline,
    remoteActionsEnabled,
    remoteActionsDisabled,
  };
}

export type ToolsPrinterConnectionState = ReturnType<
  typeof useToolsPrinterConnection
>;
