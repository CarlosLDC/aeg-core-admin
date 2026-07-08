"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import {
  ToolsActionButton,
  toolsPanelSectionClass,
} from "@/components/tools/tools-ui";
import { useToolsMqtt } from "@/modules/tools/mqtt/use-tools-mqtt";
import { cn } from "@/lib/utils";

type ToolsPrinterStatusBarProps = {
  printerId: number;
  macAddress: string | null;
};

export function ToolsPrinterStatusBar({
  printerId,
  macAddress,
}: ToolsPrinterStatusBarProps) {
  const { status, loading, error, mqttReady, refreshStatus } = useToolsMqtt(
    printerId,
    macAddress,
  );

  useEffect(() => {
    if (mqttReady) {
      void refreshStatus();
    }
  }, [mqttReady, refreshStatus]);

  if (!mqttReady) {
    return null;
  }

  const seniatLabel =
    status?.seniatStatus ?? (loading ? "Consultando…" : "Sin datos");
  const isOnline = status?.seniatStatus === "EN LINEA";

  return (
    <div
      className={cn(
        toolsPanelSectionClass,
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2">
          <span
            className={cn(
              "size-2.5 rounded-full",
              loading
                ? "animate-pulse bg-muted"
                : isOnline
                  ? "bg-emerald-500"
                  : "bg-rose-500",
            )}
            aria-hidden
          />
          <span className="text-muted">SENIAT:</span>{" "}
          <span className="font-medium text-card-foreground">{seniatLabel}</span>
        </span>
        {status?.additionalInfo?.ipAddress ? (
          <span className="font-mono text-muted">
            IP: {status.additionalInfo.ipAddress}
          </span>
        ) : null}
        {status?.additionalInfo?.wifiNetwork ? (
          <span className="text-muted">
            WiFi: {status.additionalInfo.wifiNetwork}
          </span>
        ) : null}
        {error ? (
          <span className="text-rose-600 dark:text-rose-400">{error}</span>
        ) : null}
      </div>
      <ToolsActionButton
        loading={loading}
        onClick={() => void refreshStatus()}
        className="shrink-0"
      >
        {!loading ? <RefreshCw className="size-4" aria-hidden /> : null}
        Actualizar estado
      </ToolsActionButton>
    </div>
  );
}
