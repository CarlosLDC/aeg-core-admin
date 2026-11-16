"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import {
  AlertTriangle,
  Cable,
  Check,
  CheckCircle2,
  Loader2,
  Radio,
  RefreshCw,
  Unplug,
  Wifi,
  WifiOff,
} from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { WifiSignalIndicator } from "@/components/ui/wifi-signal-indicator";
import type { UsbWifiConfigState } from "@/hooks/use-usb-wifi-config";
import { hasValidIpAddress } from "@/modules/fiscalizacion/use-fiscalizacion-usb-wizard";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";

type PrinterUsbWifiStepProps = {
  usbWifi: UsbWifiConfigState;
  disabled?: boolean;
};

/**
 * Mobile-friendly optional step to configure the printer's Wi-Fi over Web Serial (USB).
 */
export function PrinterUsbWifiStep({
  usbWifi,
  disabled = false,
}: PrinterUsbWifiStepProps) {
  const ssidId = useId();
  const passwordId = useId();
  const passwordWrapperRef = useRef<HTMLDivElement>(null);

  const isBusy =
    disabled || usbWifi.usbBusy || usbWifi.wifiScanning || usbWifi.wifiConnecting;
  const validIp = hasValidIpAddress(usbWifi.status.ipAddress)
    ? usbWifi.status.ipAddress!.trim()
    : null;
  const wifiConnected = usbWifi.wifiConnection.connected === true;
  const wifiDisconnected = usbWifi.wifiConnection.connected === false;

  function focusPasswordInput() {
    window.setTimeout(() => {
      passwordWrapperRef.current?.querySelector("input")?.focus();
    }, 0);
  }

  function handleSsidKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      focusPasswordInput();
    }
  }

  function handlePasswordKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (usbWifi.wifiSsid.trim() && !isBusy) {
        void usbWifi.connectWifi();
      }
    }
  }

  return (
    <div
      className="min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-0.5"
      style={{ touchAction: "pan-y" }}
    >
      {!usbWifi.usbSupported ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-sm text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="space-y-0.5">
            <p className="font-medium">Web Serial no disponible</p>
            <p className="text-xs opacity-90">
              Usa Chrome o Edge en escritorio o Android con adaptador USB, o
              pulsa Continuar para omitir este paso.
            </p>
          </div>
        </div>
      ) : null}

      {!usbWifi.usbConnected ? (
        <section className="rounded-xl border border-border bg-foreground/[0.02] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Cable className="size-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-semibold text-card-foreground">
                  Conectar impresora por USB
                </h3>
                <p className="text-xs leading-relaxed text-muted">
                  Conecta el cable USB (o adaptador OTG en móvil) para buscar
                  redes y guardar el Wi-Fi antes de generar el ticket.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void usbWifi.connectUsb()}
              disabled={!usbWifi.usbSupported || isBusy}
              className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 active:scale-[0.99] disabled:opacity-50 sm:h-10 sm:w-auto"
            >
              {usbWifi.usbBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Cable className="size-4" aria-hidden />
              )}
              Conectar por USB
            </button>
          </div>

          {usbWifi.usbError ? (
            <p
              role="alert"
              className="mt-3.5 flex items-start gap-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-900 dark:text-rose-200"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{usbWifi.usbError}</span>
            </p>
          ) : null}
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    USB conectado
                  </span>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      wifiConnected
                        ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                        : wifiDisconnected
                          ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                          : "bg-foreground/[0.06] text-muted",
                    )}
                  >
                    {wifiConnected ? (
                      <Wifi className="size-3 shrink-0" aria-hidden />
                    ) : (
                      <WifiOff className="size-3 shrink-0" aria-hidden />
                    )}
                    <span className="max-w-[180px] truncate">
                      {usbWifi.wifiConnection.label}
                    </span>
                  </span>

                  {validIp ? (
                    <span className="rounded-md bg-background/80 px-2 py-0.5 font-mono text-[11px] text-foreground ring-1 ring-border/70">
                      {validIp}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
                <button
                  type="button"
                  onClick={() => void usbWifi.refreshStatus()}
                  disabled={isBusy}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-card-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50 sm:h-8"
                >
                  <RefreshCw
                    className={cn("size-3.5", usbWifi.usbBusy && "animate-spin")}
                    aria-hidden
                  />
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={() => void usbWifi.disconnectUsb()}
                  disabled={isBusy}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-muted transition-colors hover:bg-foreground/5 hover:text-card-foreground disabled:opacity-50 sm:h-8"
                >
                  <Unplug className="size-3.5" aria-hidden />
                  Desconectar
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-foreground/[0.02] p-3.5 sm:p-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Radio className="size-4 text-sky-600 dark:text-sky-400" aria-hidden />
                  <h3 className="text-sm font-semibold text-card-foreground">
                    Redes disponibles
                  </h3>
                  {usbWifi.wifiNetworks.length > 0 ? (
                    <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-medium text-muted">
                      {usbWifi.wifiNetworks.length}
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => void usbWifi.scanWifi()}
                  disabled={isBusy}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-card-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50 sm:h-8"
                >
                  {usbWifi.wifiScanning ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="size-3.5" aria-hidden />
                  )}
                  {usbWifi.hasScanned ? "Reescanear" : "Buscar redes"}
                </button>
              </div>

              {usbWifi.wifiScanning ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-6 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
                  <span>Buscando redes Wi-Fi cercanas…</span>
                </div>
              ) : usbWifi.wifiNetworks.length > 0 ? (
                <div
                  role="listbox"
                  aria-label="Redes Wi-Fi detectadas"
                  className="max-h-44 divide-y divide-border/60 overflow-y-auto rounded-xl border border-border bg-background"
                  style={{ touchAction: "pan-y" }}
                >
                  {usbWifi.wifiNetworks.map((net) => {
                    const isConnectedNet =
                      usbWifi.connectedSsid.length > 0 &&
                      usbWifi.connectedSsid === net.ssid;
                    const isSelected = usbWifi.wifiSsid === net.ssid;

                    return (
                      <button
                        key={net.ssid}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={isBusy}
                        onClick={() => {
                          usbWifi.setWifiSsid(net.ssid);
                          focusPasswordInput();
                        }}
                        className={cn(
                          "flex min-h-[46px] w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-foreground/[0.04] active:bg-foreground/[0.06] disabled:opacity-50",
                          isSelected && "bg-accent/10",
                        )}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                          <WifiSignalIndicator signal={net.signal} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-card-foreground">
                            {net.ssid}
                          </span>
                        </span>

                        <span className="flex shrink-0 items-center gap-2">
                          {isConnectedNet ? (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                              Actual
                            </span>
                          ) : null}
                          {isSelected ? (
                            <Check className="size-4 text-accent" aria-hidden />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : usbWifi.hasScanned ? (
                <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-4 text-center text-xs text-muted">
                  No se detectaron redes cercanas. Puedes escribir el nombre de la
                  red manualmente abajo.
                </div>
              ) : (
                <div className="flex flex-col items-center justify-between gap-2.5 rounded-xl border border-dashed border-border bg-background/60 px-4 py-3.5 text-center sm:flex-row sm:text-left">
                  <p className="text-xs text-muted">
                    Escanea para elegir una red de la lista o escribe el SSID
                    manualmente.
                  </p>
                  <button
                    type="button"
                    onClick={() => void usbWifi.scanWifi()}
                    disabled={isBusy}
                    className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3.5 text-xs font-medium text-card-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50 sm:h-8 sm:w-auto"
                  >
                    <Radio className="size-3.5 text-sky-600 dark:text-sky-400" aria-hidden />
                    Escanear redes
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-border/70 pt-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={ssidId}
                    className="mb-1.5 block text-xs font-medium text-foreground"
                  >
                    SSID (Red Wi-Fi)
                  </label>
                  <input
                    id={ssidId}
                    type="text"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    value={usbWifi.wifiSsid}
                    onChange={(e) => usbWifi.setWifiSsid(e.target.value)}
                    onKeyDown={handleSsidKeyDown}
                    disabled={isBusy}
                    placeholder="Nombre de la red"
                    className={cn(
                      formFieldInputClass,
                      "h-11 text-base sm:h-10 sm:text-sm",
                    )}
                  />
                </div>

                <div ref={passwordWrapperRef}>
                  <label
                    htmlFor={passwordId}
                    className="mb-1.5 block text-xs font-medium text-foreground"
                  >
                    Contraseña
                  </label>
                  <PasswordInput
                    id={passwordId}
                    value={usbWifi.wifiPassword}
                    onChange={usbWifi.setWifiPassword}
                    onKeyDown={handlePasswordKeyDown}
                    enterKeyHint="done"
                    autoComplete="new-password"
                    disabled={isBusy}
                    placeholder="Contraseña Wi-Fi"
                    className="h-11 text-base sm:h-10 sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-muted">
                  Deja la contraseña vacía si la red es abierta.
                </p>
                <button
                  type="button"
                  onClick={() => void usbWifi.connectWifi()}
                  disabled={!usbWifi.wifiSsid.trim() || isBusy}
                  className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 active:scale-[0.99] disabled:opacity-50 sm:h-10 sm:w-auto"
                >
                  {usbWifi.wifiConnecting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Wifi className="size-4" aria-hidden />
                  )}
                  Conectar Wi-Fi
                </button>
              </div>
            </div>

            {usbWifi.wifiMessage ? (
              <p
                role="status"
                className="flex items-start gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2.5 text-xs font-medium text-emerald-900 dark:text-emerald-200"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{usbWifi.wifiMessage}</span>
              </p>
            ) : null}

            {usbWifi.wifiError ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-900 dark:text-rose-200"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{usbWifi.wifiError}</span>
              </p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
