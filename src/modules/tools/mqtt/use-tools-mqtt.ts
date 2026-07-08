"use client";

import { useCallback, useState } from "react";
import { fetchToolsMqttStatus, getToolsMqttErrorMessage } from "@/lib/tools-mqtt-api";
import type { ToolsMqttStatusResponse } from "@/types/tools-mqtt";

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
