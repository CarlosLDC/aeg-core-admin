"use client";

import { RefreshCw } from "lucide-react";
import {
  ToolsActionButton,
  ToolsIconBadge,
  toolsPanelSectionClass,
} from "@/components/tools/tools-ui";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import type { ToolsPrinterConnectionState } from "@/modules/tools/mqtt/use-tools-mqtt";
import { cn } from "@/lib/utils";

type ToolsPrinterStatusBarProps = {
  connection: ToolsPrinterConnectionState;
};

export function ToolsPrinterStatusBar({ connection }: ToolsPrinterStatusBarProps) {
  const { status, loading, error, mqttReady, refreshStatus } = connection;
  const statusSection = TOOLS_SECTIONS.status;

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
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <ToolsIconBadge
          icon={statusSection.icon}
          tone={statusSection.tone}
          size="md"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-card-foreground">
            {statusSection.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
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
              <span className="font-medium text-card-foreground">
                {seniatLabel}
              </span>
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
        </div>
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
