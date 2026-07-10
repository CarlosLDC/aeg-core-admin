"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2, Radio, Unplug } from "lucide-react";
import { FieldLabel } from "@/components/ui/field-label";
import {
  ToolsActionButton,
  ToolsConnectionWarning,
  ToolsPage,
  ToolsPanelActions,
  ToolsPanelSection,
  ToolsSectionHeading,
  ToolsSectionStatusActions,
  toolsListItemClass,
} from "@/components/tools/tools-ui";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { useToolsPrinterConnection } from "@/modules/tools/mqtt/use-tools-mqtt";
import {
  connectToolsWifi,
  getToolsMqttErrorMessage,
  resetToolsWifi,
  scanToolsWifi,
} from "@/lib/tools-mqtt-api";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { useToast } from "@/context/toast-provider";
import { cn } from "@/lib/utils";

type ToolsWifiPanelProps = {
  printer: ToolsPrinter;
};

type WifiNetwork = {
  ssid: string;
  signal: number | null;
};

function wifiSignalLevel(signal: number): 0 | 1 | 2 | 3 | 4 {
  if (signal >= 0 && signal <= 100) {
    if (signal >= 80) return 4;
    if (signal >= 60) return 3;
    if (signal >= 40) return 2;
    if (signal >= 20) return 1;
    return 0;
  }

  if (signal >= -55) return 4;
  if (signal >= -65) return 3;
  if (signal >= -75) return 2;
  if (signal >= -85) return 1;
  return 0;
}

function formatWifiSignalLabel(signal: number): string {
  if (signal >= 0 && signal <= 100) {
    return `Calidad de señal ${signal}%`;
  }

  return `Intensidad de señal ${signal} dBm`;
}

function WifiSignalIndicator({ signal }: { signal: number | null }) {
  const level = signal != null ? wifiSignalLevel(signal) : 0;

  return (
    <span
      className="inline-flex shrink-0 items-end gap-0.5 text-sky-600 dark:text-sky-400"
      aria-label={
        signal != null ? formatWifiSignalLabel(signal) : "Señal desconocida"
      }
      title={
        signal != null
          ? signal >= 0 && signal <= 100
            ? `${signal}%`
            : `${signal} dBm`
          : undefined
      }
    >
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={cn(
            "w-1 rounded-sm bg-current",
            bar <= level ? "opacity-100" : "opacity-20",
          )}
          style={{ height: `${bar * 3 + 4}px` }}
          aria-hidden
        />
      ))}
    </span>
  );
}

const wifiPanelFillClass = "flex h-full min-h-0 flex-col";
const wifiPanelGridClass =
  "grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 [&>*]:min-h-0";

export function ToolsWifiPanel({ printer }: ToolsWifiPanelProps) {
  const toast = useToast();
  const section = TOOLS_SECTIONS.wifi;
  const { status, loading: statusLoading, refreshStatus, remoteActionsDisabled, connectionResolved, isOnline, mqttReady } =
    useToolsPrinterConnection(printer.id, printer.macAddress);
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanning, setScanning] = useState(true);
  const [action, setAction] = useState<"connect" | "disconnect" | null>(null);

  const connectedSsid = status?.additionalInfo?.wifiNetwork?.trim() ?? "";

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const result = await scanToolsWifi(printer.id);
      setNetworks(result.networks ?? []);
    } catch (err) {
      setNetworks([]);
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setScanning(false);
    }
  }, [printer.id, toast]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await runScan();
      if (!cancelled) {
        await refreshStatus();
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [refreshStatus, runScan]);

  const runConnect = async () => {
    setAction("connect");
    try {
      const result = await connectToolsWifi(printer.id, ssid, password);
      if (result.success) {
        toast.success(result.message ?? "Conexión WiFi enviada.");
        await Promise.all([refreshStatus(), runScan()]);
      } else {
        toast.error(result.message ?? "No se pudo conectar.");
      }
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setAction(null);
    }
  };

  const runDisconnect = async (networkSsid: string) => {
    setAction("disconnect");
    try {
      const result = await resetToolsWifi(printer.id);
      if (result.success) {
        toast.success(result.message ?? `Desconectado de ${networkSsid}.`);
        if (ssid === networkSsid) {
          setSsid("");
          setPassword("");
        }
        await Promise.all([refreshStatus(), runScan()]);
      } else {
        toast.error(result.message ?? "No se pudo desconectar.");
      }
    } catch (err) {
      toast.error(getToolsMqttErrorMessage(err));
    } finally {
      setAction(null);
    }
  };

  const busy = scanning || action != null;

  return (
    <ToolsPrinterMacGuard macAddress={printer.macAddress}>
      <ToolsPage>
        <ToolsSectionHeading
          icon={section.icon}
          tone={section.tone}
          title={section.title}
          description={section.description}
          actions={
            <ToolsSectionStatusActions
              statusRefresh={{
                loading: statusLoading,
                refreshStatus,
                mqttReady,
              }}
            />
          }
        />

        {connectionResolved && !isOnline ? <ToolsConnectionWarning /> : null}

        <div className={wifiPanelGridClass}>
          <ToolsPanelSection
            title="Redes disponibles"
            description="Las redes se detectan automáticamente al abrir esta pantalla."
            icon={Radio}
            tone="sky"
            className={wifiPanelFillClass}
            contentClassName="flex min-h-0 flex-1 flex-col"
          >
            <div
              className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background/50"
              aria-label="Redes detectadas"
            >
              {scanning ? (
                <div className="flex flex-1 items-center justify-center gap-2 px-4 py-8 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Escaneando redes…
                </div>
              ) : networks.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center text-sm text-muted">
                  <p>No se detectaron redes WiFi.</p>
                  <ToolsActionButton
                    disabled={busy || remoteActionsDisabled}
                    onClick={() => void runScan()}
                  >
                    Reintentar conexión
                  </ToolsActionButton>
                </div>
              ) : (
                <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain p-2">
                  {networks.map((network) => {
                    const isConnected =
                      connectedSsid.length > 0 &&
                      connectedSsid === network.ssid;
                    const isSelected = ssid === network.ssid;

                    return (
                      <li
                        key={network.ssid}
                        className={cn(
                          toolsListItemClass,
                          "flex items-center gap-3",
                          isConnected &&
                            "border-sky-500/35 bg-sky-500/[0.06] ring-1 ring-sky-500/20",
                          isSelected &&
                            !isConnected &&
                            "border-accent/40 bg-accent/[0.04]",
                        )}
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          onClick={() => setSsid(network.ssid)}
                        >
                          <WifiSignalIndicator signal={network.signal} />
                          <span className="min-w-0 flex-1 truncate font-medium text-card-foreground">
                            {network.ssid}
                          </span>
                          {isConnected ? (
                            <span className="shrink-0 text-xs font-medium text-sky-700 dark:text-sky-300">
                              Conectada
                            </span>
                          ) : null}
                        </button>
                        {isConnected ? (
                          <button
                            type="button"
                            disabled={busy || remoteActionsDisabled}
                            onClick={() => void runDisconnect(network.ssid)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-foreground/[0.04] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {action === "disconnect" ? (
                              <Loader2 className="size-3.5 animate-spin" aria-hidden />
                            ) : (
                              <Unplug className="size-3.5" aria-hidden />
                            )}
                            Desconectar
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </ToolsPanelSection>

          <ToolsPanelSection
            title="Conectar"
            description="Seleccione una red y envíe las credenciales a la impresora."
            icon={Link2}
            tone="sky"
            className={wifiPanelFillClass}
            contentClassName="flex min-h-0 flex-1 flex-col"
          >
            <div className="space-y-3">
              <label className="block">
                <FieldLabel className="text-muted">SSID</FieldLabel>
                <input
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  className={formFieldInputClass}
                />
              </label>
              <label className="block">
                <FieldLabel className="text-muted">Contraseña</FieldLabel>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={formFieldInputClass}
                />
              </label>
            </div>
            <ToolsPanelActions className="mt-auto pt-4">
              <ToolsActionButton
                loading={action === "connect"}
                disabled={busy || !ssid.trim() || remoteActionsDisabled}
                onClick={() => void runConnect()}
              >
                Conectar
              </ToolsActionButton>
            </ToolsPanelActions>
          </ToolsPanelSection>
        </div>
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
