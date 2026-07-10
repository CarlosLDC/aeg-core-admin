"use client";

import {
  ToolsIconBadge,
  ToolsRefreshStatusButton,
  toolsPanelSectionClass,
} from "@/components/tools/tools-ui";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { formatToolsWifiStatusLine } from "@/lib/tools-wifi-networks";
import type { ToolsPrinterConnectionState } from "@/modules/tools/mqtt/use-tools-mqtt";
import { useToolsTransportContext } from "@/modules/tools/transport/tools-transport-provider";
import { cn } from "@/lib/utils";
import { Cable } from "lucide-react";

type ToolsPrinterStatusBarProps = {
  connection: ToolsPrinterConnectionState;
};

export function ToolsPrinterStatusBar({ connection }: ToolsPrinterStatusBarProps) {
  const { mode } = useToolsTransportContext();
  const {
    status,
    loading,
    error,
    refreshStatus,
    connectionIssue,
    isSeniatOnline,
  } = connection;
  const statusSection = TOOLS_SECTIONS.status;

  const seniatLabel =
    status?.seniatStatus ?? (loading ? "Consultando…" : "Sin datos");

  return (
    <div
      className={cn(
        toolsPanelSectionClass,
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <ToolsIconBadge
          icon={mode === "usb" ? Cable : statusSection.icon}
          tone={statusSection.tone}
          size="md"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-card-foreground">
            {mode === "usb" ? "Estado (USB)" : statusSection.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {mode === "usb" ? (
              <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <span className="size-2.5 rounded-full bg-emerald-500" aria-hidden />
                USB conectado
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2">
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  loading
                    ? "animate-pulse bg-muted"
                    : isSeniatOnline
                      ? "bg-emerald-500"
                      : connectionIssue === "seniat"
                        ? "bg-amber-500"
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
                {formatToolsWifiStatusLine(status.additionalInfo.wifiNetwork)}
              </span>
            ) : null}
            {error ? (
              <span
                className={cn(
                  connectionIssue === "seniat"
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-rose-600 dark:text-rose-400",
                )}
              >
                {error}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <ToolsRefreshStatusButton
        loading={loading}
        onRefresh={refreshStatus}
        className="shrink-0"
      />
    </div>
  );
}
