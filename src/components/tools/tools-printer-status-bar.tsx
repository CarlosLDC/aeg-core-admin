"use client";

import {
  ToolsIconBadge,
  ToolsRefreshStatusButton,
  toolsPanelSectionClass,
} from "@/components/tools/tools-ui";
import { ToolsUsbConnectionButton } from "@/components/tools/tools-connection-mode-switch";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { formatToolsWifiStatusLine } from "@/lib/tools-wifi-networks";
import { isUsableToolsNetworkField } from "@/lib/tools-printer-connection";
import type { ToolsPrinterConnectionState } from "@/modules/tools/mqtt/use-tools-mqtt";
import { useToolsTransportContext } from "@/modules/tools/transport/tools-transport-provider";
import { cn } from "@/lib/utils";

type ToolsPrinterStatusBarProps = {
  connection: ToolsPrinterConnectionState;
};

export function ToolsPrinterStatusBar({ connection }: ToolsPrinterStatusBarProps) {
  const { usbConnected } = useToolsTransportContext();
  const {
    status,
    loading,
    error,
    refreshStatus,
    connectionIssue,
    isSeniatOnline,
    networkInfo,
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
          icon={statusSection.icon}
          tone={statusSection.tone}
          size="md"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-card-foreground">
            {statusSection.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {usbConnected ? (
              <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <span className="size-2.5 rounded-full bg-emerald-500" aria-hidden />
                USB activo
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
            {isUsableToolsNetworkField(networkInfo?.ipAddress) ? (
              <span className="font-mono text-muted">
                IP: {networkInfo?.ipAddress}
              </span>
            ) : null}
            {isUsableToolsNetworkField(networkInfo?.wifiNetwork) ? (
              <span className="text-muted">
                {formatToolsWifiStatusLine(networkInfo?.wifiNetwork)}
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
      <div className="flex shrink-0 items-center gap-2">
        <ToolsUsbConnectionButton />
        <ToolsRefreshStatusButton
          loading={loading}
          onRefresh={refreshStatus}
        />
      </div>
    </div>
  );
}
