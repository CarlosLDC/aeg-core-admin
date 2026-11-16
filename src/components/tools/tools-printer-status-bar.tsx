"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Clock,
  Globe,
  MoreHorizontal,
  Printer,
  RefreshCw,
  ScrollText,
  TriangleAlert,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  ToolsIconBadge,
  ToolsRefreshStatusButton,
  toolsActionButtonClass,
  toolsSurfaceClass,
} from "@/components/tools/tools-ui";
import { ToolsUsbConnectionButton } from "@/components/tools/tools-connection-mode-switch";
import { printerPath } from "@/lib/resource-routes";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { formatToolsWifiStatusLine } from "@/lib/tools-wifi-networks";
import {
  isUsableToolsNetworkField,
  resolveToolsStatusBarNotice,
} from "@/lib/tools-printer-connection";
import type { ToolsPrinterConnectionState } from "@/modules/tools/mqtt/use-tools-mqtt";
import { useToolsTransportContext } from "@/modules/tools/transport/tools-transport-provider";
import { cn } from "@/lib/utils";

type ToolsPrinterStatusBarProps = {
  connection: ToolsPrinterConnectionState;
  printerId?: number;
  logsHref?: string;
};

const menuItemClass =
  "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-card-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2";

type MenuCoords = {
  top: number;
  left: number;
  openUp: boolean;
};

const MENU_PADDING_PX = 8;
const MENU_ESTIMATED_WIDTH_PX = 192;

function computeMenuCoords(
  trigger: HTMLButtonElement,
  menu: HTMLDivElement | null,
  itemCount: number,
): MenuCoords {
  const rect = trigger.getBoundingClientRect();
  const estimatedHeight = itemCount * 40 + 8;
  const menuHeight = menu?.offsetHeight ?? estimatedHeight;
  const menuWidth = menu?.offsetWidth ?? MENU_ESTIMATED_WIDTH_PX;
  const spaceBelow = window.innerHeight - MENU_PADDING_PX - rect.bottom;
  const spaceAbove = rect.top - MENU_PADDING_PX;
  const openUp = spaceBelow < menuHeight + 4 && spaceAbove > spaceBelow;

  const rightAlignedLeft = rect.right - menuWidth;
  const preferredLeft =
    rightAlignedLeft >= MENU_PADDING_PX ? rightAlignedLeft : rect.left;
  const maxLeft = Math.max(
    MENU_PADDING_PX,
    window.innerWidth - menuWidth - MENU_PADDING_PX,
  );
  const left = Math.min(Math.max(preferredLeft, MENU_PADDING_PX), maxLeft);

  return {
    top: openUp ? rect.top - 4 : rect.bottom + 4,
    left,
    openUp,
  };
}

function ToolsStatusActionsMenu({
  printerId,
  logsHref,
  clockDisabled,
  clockLoading,
  onRefreshClock,
}: {
  printerId?: number;
  logsHref?: string;
  clockDisabled: boolean;
  clockLoading: boolean;
  onRefreshClock: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuItemCount = 1 + (logsHref != null ? 1 : 0) + (printerId != null ? 1 : 0);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const updateCoords = () => {
      const trigger = triggerRef.current;
      if (trigger) {
        setCoords(computeMenuCoords(trigger, menuRef.current, menuItemCount));
      }
    };
    const frame = requestAnimationFrame(updateCoords);
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updateCoords);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [open, menuItemCount]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setCoords(null);
  };

  const menu =
    open && coords ? (
      <div
        id={menuId}
        ref={menuRef}
        role="menu"
        className="fixed z-[100] min-w-48 max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-card py-1 shadow-lg"
        style={{
          top: coords.top,
          left: coords.left,
          transform: coords.openUp ? "translateY(-100%)" : undefined,
        }}
      >
        <button
          type="button"
          role="menuitem"
          disabled={clockDisabled || clockLoading}
          className={menuItemClass}
          onClick={() => {
            close();
            void onRefreshClock();
          }}
        >
          <Clock className="size-4 shrink-0 text-muted" aria-hidden />
          Consultar reloj (RTC)
        </button>
        {logsHref != null ? (
          <Link
            href={logsHref}
            role="menuitem"
            className={menuItemClass}
            onClick={close}
          >
            <ScrollText className="size-4 shrink-0 text-muted" aria-hidden />
            Logs
          </Link>
        ) : null}
        {printerId != null ? (
          <Link
            href={printerPath(printerId)}
            role="menuitem"
            className={menuItemClass}
            onClick={close}
          >
            <Printer className="size-4 shrink-0 text-muted" aria-hidden />
            Ir a impresora
          </Link>
        ) : null}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) {
            close();
            return;
          }
          if (triggerRef.current) {
            setCoords(
              computeMenuCoords(triggerRef.current, menuRef.current, menuItemCount),
            );
          }
          setOpen(true);
        }}
        className={cn(
          toolsActionButtonClass,
          "min-h-10 w-auto min-w-10 px-2.5 sm:min-h-0 sm:min-w-0",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="Más acciones"
        aria-label="Más acciones de estado"
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      {typeof document !== "undefined" && menu
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}

type StatusPillTone = "emerald" | "amber" | "rose" | "muted";

const STATUS_PILL_CLASSES: Record<StatusPillTone, { container: string; dot: string }> =
  {
    emerald: {
      container:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    },
    amber: {
      container:
        "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
      dot: "bg-amber-500",
    },
    rose: {
      container: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      dot: "bg-rose-500",
    },
    muted: {
      container: "border-border bg-foreground/[0.04] text-muted",
      dot: "bg-muted",
    },
  };

/** Compact rounded pill with leading status indicator dot. */
function StatusPill({
  tone,
  pulse = false,
  children,
}: {
  tone: StatusPillTone;
  pulse?: boolean;
  children: React.ReactNode;
}) {
  const styles = STATUS_PILL_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles.container,
      )}
    >
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          styles.dot,
          pulse && "animate-pulse",
        )}
        aria-hidden
      />
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Responsive telemetry item: stacked key-value row on mobile, inline chip on desktop. */
function TelemetryItem({
  icon,
  label,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-w-0 items-center justify-between gap-3 sm:justify-start sm:gap-1.5"
      title={title}
    >
      <span className="inline-flex shrink-0 items-center gap-1.5 text-muted">
        {icon}
        <span>{label}:</span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        {children}
        {action}
      </span>
    </div>
  );
}

export function ToolsPrinterStatusBar({
  connection,
  printerId,
  logsHref,
}: ToolsPrinterStatusBarProps) {
  const { usbConnected } = useToolsTransportContext();
  const {
    status,
    loading,
    error,
    clock,
    clockLoading,
    clockError,
    refreshClock,
    refreshStatus,
    connectionResolved,
    connectionIssue,
    isPrinterReachable,
    isLegacyBroker,
    isSeniatOnline,
    networkInfo,
    transportReady,
  } = connection;
  const statusSection = TOOLS_SECTIONS.status;

  // Only surface the SENIAT pill when the printer actually responded; when it
  // is unreachable, the unified footer banner below explains the failure.
  const showSeniatPill = !loading && isPrinterReachable;
  const seniatLabel = status?.seniatStatus ?? "Sin datos";
  const seniatTone: StatusPillTone = isSeniatOnline ? "emerald" : "amber";
  const notice = resolveToolsStatusBarNotice({
    loading,
    transportReady,
    usbConnected,
    connectionResolved,
    connectionIssue,
    error,
  });

  const canQueryClock = transportReady && (isPrinterReachable || usbConnected);
  const showClockChip =
    (isPrinterReachable || usbConnected) &&
    (clock != null || clockLoading || clockError != null);
  const hasIp = isUsableToolsNetworkField(networkInfo?.ipAddress);
  const hasWifi = isUsableToolsNetworkField(networkInfo?.wifiNetwork);
  const wifiStatusText = hasWifi
    ? formatToolsWifiStatusLine(networkInfo?.wifiNetwork).replace(/^WiFi:\s*/, "")
    : null;

  const telemetryItems: Array<{ id: string; node: React.ReactNode }> = [];
  if (showClockChip) {
    telemetryItems.push({
      id: "clock",
      node: (
        <TelemetryItem
          icon={<Clock className="size-3.5 shrink-0" aria-hidden />}
          label="Reloj"
          title={clockError ?? "Reloj de tiempo real (RTC) de la impresora"}
          action={
            canQueryClock ? (
              <button
                type="button"
                onClick={() => void refreshClock()}
                disabled={clockLoading}
                aria-label="Actualizar reloj de la impresora"
                title="Actualizar reloj (RTC)"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-card text-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-50 sm:size-6 sm:border-transparent sm:bg-transparent"
              >
                <RefreshCw
                  className={cn("size-3.5 sm:size-3", clockLoading && "animate-spin")}
                  aria-hidden
                />
              </button>
            ) : null
          }
        >
          {clockLoading ? (
            <span className="font-medium text-card-foreground">Consultando…</span>
          ) : clock ? (
            <span className="font-mono font-medium tabular-nums text-card-foreground">
              {clock}
            </span>
          ) : (
            <span className="font-medium text-amber-700 dark:text-amber-300">
              No disponible
            </span>
          )}
        </TelemetryItem>
      ),
    });
  }
  if (hasIp) {
    telemetryItems.push({
      id: "ip",
      node: (
        <TelemetryItem
          icon={<Globe className="size-3.5 shrink-0" aria-hidden />}
          label="IP"
        >
          <span className="font-mono font-medium tabular-nums text-card-foreground">
            {networkInfo?.ipAddress}
          </span>
        </TelemetryItem>
      ),
    });
  }
  if (wifiStatusText) {
    telemetryItems.push({
      id: "wifi",
      node: (
        <TelemetryItem
          icon={<Wifi className="size-3.5 shrink-0" aria-hidden />}
          label="WiFi"
          title={wifiStatusText}
        >
          <span className="truncate font-medium text-card-foreground">
            {wifiStatusText}
          </span>
        </TelemetryItem>
      ),
    });
  }

  return (
    <div className={cn(toolsSurfaceClass, "overflow-hidden")}>
      {/* Nivel 1: Identidad, estado operativo crítico y acciones */}
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <ToolsIconBadge
            icon={statusSection.icon}
            tone={statusSection.tone}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-card-foreground">
                {statusSection.title}
              </p>
              {loading ? (
                <StatusPill tone="muted" pulse>
                  Consultando…
                </StatusPill>
              ) : null}
              {showSeniatPill ? (
                <StatusPill tone={seniatTone}>
                  <span className="opacity-80">SENIAT:</span>{" "}
                  <span className="font-semibold">{seniatLabel}</span>
                </StatusPill>
              ) : null}
              {usbConnected ? <StatusPill tone="emerald">USB activo</StatusPill> : null}
              {isLegacyBroker ? (
                <StatusPill tone="amber">Broker: Antiguo (contingencia)</StatusPill>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
          <ToolsUsbConnectionButton className="min-h-10 sm:min-h-0" />
          <ToolsRefreshStatusButton
            loading={loading}
            onRefresh={refreshStatus}
            className="min-h-10 flex-1 sm:min-h-0 sm:flex-initial"
          />
          <ToolsStatusActionsMenu
            printerId={printerId}
            logsHref={logsHref}
            clockDisabled={!canQueryClock}
            clockLoading={clockLoading}
            onRefreshClock={refreshClock}
          />
        </div>
      </div>

      {/* Nivel 2: Franja de telemetría técnica */}
      {telemetryItems.length > 0 ? (
        <div className="border-t border-border/70 bg-foreground/[0.02] px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-2.5 text-[13px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2 sm:text-sm">
            {telemetryItems.map((item, index) => (
              <div key={item.id} className="contents">
                {index > 0 ? (
                  <span className="hidden h-3.5 w-px bg-border sm:block" aria-hidden />
                ) : null}
                {item.node}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Nivel 3: Estado de conexión / error unificado */}
      {notice ? (
        <div
          role="status"
          className={cn(
            "flex items-start gap-2 border-t px-4 py-2.5 text-xs sm:px-5 sm:text-sm",
            notice.tone === "amber"
              ? "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-200"
              : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
          )}
        >
          {notice.kind === "printer-offline" ? (
            <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <span className="min-w-0 break-words">{notice.message}</span>
        </div>
      ) : null}
    </div>
  );
}
