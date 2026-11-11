"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Clock, MoreHorizontal, Printer, RefreshCw } from "lucide-react";
import {
  ToolsIconBadge,
  ToolsRefreshStatusButton,
  toolsActionButtonClass,
  toolsPanelSectionClass,
} from "@/components/tools/tools-ui";
import { ToolsUsbConnectionButton } from "@/components/tools/tools-connection-mode-switch";
import { printerPath } from "@/lib/resource-routes";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { formatToolsWifiStatusLine } from "@/lib/tools-wifi-networks";
import { isUsableToolsNetworkField } from "@/lib/tools-printer-connection";
import type { ToolsPrinterConnectionState } from "@/modules/tools/mqtt/use-tools-mqtt";
import { useToolsTransportContext } from "@/modules/tools/transport/tools-transport-provider";
import { cn } from "@/lib/utils";

type ToolsPrinterStatusBarProps = {
  connection: ToolsPrinterConnectionState;
  printerId?: number;
};

const menuItemClass =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-card-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50";

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
  hasPrinterLink: boolean,
): MenuCoords {
  const rect = trigger.getBoundingClientRect();
  const estimatedHeight = (hasPrinterLink ? 2 : 1) * 40 + 8;
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
  clockDisabled,
  clockLoading,
  onRefreshClock,
}: {
  printerId?: number;
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
  const hasPrinterLink = printerId != null;

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const updateCoords = () => {
      const trigger = triggerRef.current;
      if (trigger) {
        setCoords(computeMenuCoords(trigger, menuRef.current, hasPrinterLink));
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
  }, [open, hasPrinterLink]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
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
              computeMenuCoords(triggerRef.current, menuRef.current, hasPrinterLink),
            );
          }
          setOpen(true);
        }}
        className={cn(toolsActionButtonClass, "w-auto px-2.5")}
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

export function ToolsPrinterStatusBar({ connection, printerId }: ToolsPrinterStatusBarProps) {
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
    connectionIssue,
    isPrinterReachable,
    isLegacyBroker,
    isSeniatOnline,
    networkInfo,
    transportReady,
  } = connection;
  const statusSection = TOOLS_SECTIONS.status;

  const seniatLabel =
    status?.seniatStatus ?? (loading ? "Consultando…" : "Sin datos");
  const canQueryClock = transportReady && (isPrinterReachable || usbConnected);
  const showClockChip =
    (isPrinterReachable || usbConnected) &&
    (clock != null || clockLoading || clockError != null);

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
                      : connectionIssue === "seniat" ||
                          connectionIssue === "legacy-broker"
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
            {showClockChip ? (
              <span
                className="inline-flex items-center gap-1.5 text-muted"
                title={clockError ?? "Reloj de tiempo real (RTC) de la impresora"}
              >
                <Clock className="size-3.5 shrink-0" aria-hidden />
                <span>Reloj:</span>
                {clockLoading ? (
                  <span className="text-card-foreground">Consultando…</span>
                ) : clock ? (
                  <span className="font-mono font-medium text-card-foreground">
                    {clock}
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-300">
                    No disponible
                  </span>
                )}
                {canQueryClock ? (
                  <button
                    type="button"
                    onClick={() => void refreshClock()}
                    disabled={clockLoading}
                    aria-label="Actualizar reloj de la impresora"
                    title="Actualizar reloj (RTC)"
                    className="inline-flex size-5 items-center justify-center rounded text-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
                  >
                    <RefreshCw
                      className={cn("size-3", clockLoading && "animate-spin")}
                      aria-hidden
                    />
                  </button>
                ) : null}
              </span>
            ) : null}
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
            {isLegacyBroker ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
                <span className="size-2 rounded-full bg-amber-500" aria-hidden />
                Broker: Antiguo (contingencia)
              </span>
            ) : null}
            {error ? (
              <span
                className={cn(
                  connectionIssue === "seniat" ||
                    connectionIssue === "legacy-broker"
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
      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <ToolsUsbConnectionButton />
        <ToolsRefreshStatusButton
          loading={loading}
          onRefresh={refreshStatus}
        />
        <ToolsStatusActionsMenu
          printerId={printerId}
          clockDisabled={!canQueryClock}
          clockLoading={clockLoading}
          onRefreshClock={refreshClock}
        />
      </div>
    </div>
  );
}
