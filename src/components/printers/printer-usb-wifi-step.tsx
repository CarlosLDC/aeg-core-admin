"use client";

import { useId } from "react";
import {
  AlertTriangle,
  Cable,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wifi,
} from "lucide-react";
import type { UsbWifiConfigState } from "@/hooks/use-usb-wifi-config";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";

type PrinterUsbWifiStepProps = {
  usbWifi: UsbWifiConfigState;
  disabled?: boolean;
};

/**
 * Optional step to configure the printer's Wi-Fi network over Web Serial (USB).
 */
export function PrinterUsbWifiStep({
  usbWifi,
  disabled = false,
}: PrinterUsbWifiStepProps) {
  const ssidId = useId();
  const passwordId = useId();
  const isBusy =
    disabled || usbWifi.usbBusy || usbWifi.wifiScanning || usbWifi.wifiConnecting;

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
      {!usbWifi.usbSupported ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Este navegador no admite Web Serial (USB). Usa Chrome o Edge para
            configurar el Wi-Fi por USB, o continúa sin este paso.
          </span>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-foreground/[0.02] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Cable className="size-4 shrink-0 text-accent" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">
                Conexión USB
              </p>
              <p className="text-xs text-muted">
                {usbWifi.usbConnected
                  ? "Impresora conectada por USB."
                  : "Conecta la impresora por cable USB para configurar su Wi-Fi."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {usbWifi.usbConnected ? (
              <>
                <button
                  type="button"
                  onClick={() => void usbWifi.refreshStatus()}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-foreground/5 disabled:opacity-50"
                >
                  <RefreshCw
                    className={cn("size-3.5", usbWifi.usbBusy && "animate-spin")}
                  />
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={() => void usbWifi.disconnectUsb()}
                  disabled={isBusy}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted hover:text-card-foreground disabled:opacity-50"
                >
                  Desconectar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void usbWifi.connectUsb()}
                disabled={!usbWifi.usbSupported || isBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {usbWifi.usbBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Cable className="size-3.5" />
                )}
                Conectar por USB
              </button>
            )}
          </div>
        </div>

        {usbWifi.usbError ? (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-900 dark:text-rose-200"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{usbWifi.usbError}</span>
          </p>
        ) : null}

        {usbWifi.usbConnected ? (
          <dl className="mt-3 grid gap-2 rounded-lg border border-border/70 bg-background/60 p-2.5 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted">Red Wi-Fi actual</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {usbWifi.status.wifiNetwork ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Dirección IP</dt>
              <dd className="mt-0.5 font-mono font-medium text-foreground">
                {usbWifi.status.ipAddress ?? "—"}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>

      <fieldset
        disabled={!usbWifi.usbConnected || disabled || usbWifi.wifiConnecting}
        className={cn(
          "space-y-3 rounded-lg border border-border bg-foreground/[0.02] p-3.5 transition-opacity",
          !usbWifi.usbConnected && "opacity-60",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wifi className="size-4 text-accent" aria-hidden />
            <span className="text-sm font-medium text-foreground">
              Red Wi-Fi
            </span>
          </div>

          <button
            type="button"
            onClick={() => void usbWifi.scanWifi()}
            disabled={!usbWifi.usbConnected || isBusy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-foreground/5 disabled:opacity-50"
          >
            {usbWifi.wifiScanning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Buscar redes
          </button>
        </div>

        {usbWifi.wifiNetworks.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {usbWifi.wifiNetworks.map((net) => (
              <button
                key={net.ssid}
                type="button"
                onClick={() => usbWifi.setWifiSsid(net.ssid)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  usbWifi.wifiSsid === net.ssid
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-background text-card-foreground hover:bg-foreground/5",
                )}
              >
                {net.ssid}
                {net.signal != null ? (
                  <span className="ml-1 text-[11px] text-muted">
                    ({net.signal})
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={ssidId}
              className="mb-1 block text-xs font-medium text-foreground"
            >
              SSID (Red Wi-Fi)
            </label>
            <input
              id={ssidId}
              type="text"
              autoComplete="off"
              value={usbWifi.wifiSsid}
              onChange={(e) => usbWifi.setWifiSsid(e.target.value)}
              placeholder="Nombre de la red"
              className={formFieldInputClass}
            />
          </div>
          <div>
            <label
              htmlFor={passwordId}
              className="mb-1 block text-xs font-medium text-foreground"
            >
              Contraseña
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete="new-password"
              value={usbWifi.wifiPassword}
              onChange={(e) => usbWifi.setWifiPassword(e.target.value)}
              placeholder="••••••••"
              className={formFieldInputClass}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void usbWifi.connectWifi()}
            disabled={
              !usbWifi.usbConnected || !usbWifi.wifiSsid.trim() || isBusy
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
          >
            {usbWifi.wifiConnecting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Wifi className="size-3.5" />
            )}
            Conectar Wi-Fi
          </button>
        </div>

        {usbWifi.wifiMessage ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200"
          >
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
            <span>{usbWifi.wifiMessage}</span>
          </p>
        ) : null}

        {usbWifi.wifiError ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-900 dark:text-rose-200"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{usbWifi.wifiError}</span>
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}
