"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useEffect } from "react";
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

  const seniatLabel = status?.seniatStatus ?? (loading ? "Consultando…" : "Sin datos");
  const isOnline = status?.seniatStatus === "EN LINEA";

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2">
          <span
            className={cn(
              "size-2.5 rounded-full",
              loading ? "animate-pulse bg-muted" : isOnline ? "bg-emerald-500" : "bg-rose-500",
            )}
            aria-hidden
          />
          SENIAT: <span className="font-medium">{seniatLabel}</span>
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
        {error ? <span className="text-rose-600 dark:text-rose-400">{error}</span> : null}
      </div>
      <button
        type="button"
        onClick={() => void refreshStatus()}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-foreground/[0.03] disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="size-4" aria-hidden />
        )}
        Actualizar estado
      </button>
    </div>
  );
}
