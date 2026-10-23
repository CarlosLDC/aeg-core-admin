"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Cable,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  ShieldAlert,
  Stamp,
  Wifi,
} from "lucide-react";
import { EnajenacionRitualStepper } from "@/components/mqtt/enajenacion-ritual-stepper";
import { SealSelect } from "@/components/seals/seal-select";
import { SEAL_COLOR_LABELS } from "@/lib/seal-form";
import { printerPath } from "@/lib/resource-routes";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";
import {
  hasValidIpAddress,
  useFiscalizacionUsbWizard,
} from "@/modules/fiscalizacion/use-fiscalizacion-usb-wizard";
import { SEAL_COLORS, type SealColor } from "@/types/seal";

function StepBadge({
  done,
  active,
  stepNumber,
}: {
  done: boolean;
  active?: boolean;
  stepNumber: number;
}) {
  if (done) {
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-4" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold",
        active
          ? "bg-accent text-white"
          : "bg-foreground/10 text-muted",
      )}
    >
      {stepNumber}
    </span>
  );
}

export function FiscalizacionUsbWizard() {
  const w = useFiscalizacionUsbWizard();
  const [showNewSealForm, setShowNewSealForm] = useState(false);
  const [showFallbackBroker, setShowFallbackBroker] = useState(false);

  const wifiReady = hasValidIpAddress(w.diagnostics.ipAddress);
  const ritualRunning =
    w.ritualPhase === "sending_usb" ||
    w.ritualPhase === "waiting_ack" ||
    w.ritualPhase === "waiting_result" ||
    w.ritualPhase === "waiting_config_spiffs";

  const acceptedStepIds = new Set<string>(w.sse.acceptedStepIds);
  if (
    w.ritualPhase === "waiting_ack" ||
    w.ritualPhase === "waiting_result" ||
    w.ritualPhase === "waiting_config_spiffs" ||
    w.ritualPhase === "done"
  ) {
    acceptedStepIds.add("request");
  }

  const stepStatuses: Record<string, "pending" | "success"> = {};
  for (const s of w.flowSteps) {
    stepStatuses[s.id] = acceptedStepIds.has(s.id) ? "success" : "pending";
  }

  const activeStepIndex =
    w.ritualPhase === "waiting_ack"
      ? 1
      : w.ritualPhase === "waiting_result"
        ? 2
        : w.ritualPhase === "waiting_config_spiffs"
          ? 3
          : w.ritualPhase === "done"
            ? w.flowSteps.length - 1
            : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {!w.usbSupported ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Navegador no compatible con Web Serial</p>
            <p className="mt-1">
              Para conectar impresoras nuevas por cable USB utilice Google Chrome o
              Microsoft Edge en escritorio.
            </p>
          </div>
        </div>
      ) : null}

      {/* PASO 1: Conexión USB y Diagnóstico */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <StepBadge done={w.usbConnected} active={!w.usbConnected} stepNumber={1} />
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                <Cable className="size-4 text-accent" />
                1. Conexión USB y diagnóstico
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                Conecte la impresora nueva por USB para leer su estado, dirección IP,
                broker actual y MAC.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {w.usbConnected ? (
              <>
                <button
                  type="button"
                  onClick={() => void w.runDiagnostics()}
                  disabled={w.usbBusy || ritualRunning}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-card-foreground hover:bg-foreground/5 disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", w.usbBusy && "animate-spin")} />
                  Actualizar lectura
                </button>
                <button
                  type="button"
                  onClick={() => void w.disconnectUsb()}
                  disabled={w.usbBusy || ritualRunning}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted hover:text-card-foreground disabled:opacity-50"
                >
                  Desconectar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void w.connectUsb()}
                disabled={!w.usbSupported || w.usbBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {w.usbBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Cable className="size-4" />
                )}
                Conectar impresora por USB
              </button>
            )}
          </div>
        </div>

        {w.usbError ? (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-900 dark:text-rose-200"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{w.usbError}</span>
          </p>
        ) : null}

        {w.usbConnected ? (
          <dl className="mt-4 grid gap-3 rounded-lg border border-border/70 bg-foreground/[0.02] p-3.5 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-muted">Red Wi-Fi</dt>
              <dd className="mt-0.5 font-medium text-card-foreground">
                {w.diagnostics.wifiNetwork ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Dirección IP</dt>
              <dd className="mt-0.5 font-mono font-medium text-card-foreground">
                {w.diagnostics.ipAddress ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Broker MQTT actual</dt>
              <dd className="mt-0.5 font-mono font-medium text-card-foreground">
                {w.diagnostics.currentBrokerHost ?? "No reportado"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">MAC / Firmware</dt>
              <dd className="mt-0.5 font-mono text-xs font-medium text-card-foreground">
                {w.diagnostics.detectedMac ?? "MAC no leída"}{" "}
                {w.diagnostics.firmwareVersion
                  ? `· v${w.diagnostics.firmwareVersion}`
                  : ""}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      {/* PASO 2: Configurar Wi-Fi */}
      <section
        className={cn(
          "rounded-xl border border-border bg-card p-5 shadow-sm transition-opacity",
          !w.usbConnected && "opacity-60",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <StepBadge
              done={w.usbConnected && wifiReady}
              active={w.usbConnected && !wifiReady}
              stepNumber={2}
            />
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                <Wifi className="size-4 text-accent" />
                2. Configuración Wi-Fi
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                La impresora necesita conexión a Internet para publicar su solicitud
                de fiscalización en el broker MQTT.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void w.scanWifi()}
            disabled={!w.usbConnected || w.wifiScanning || w.wifiConnecting || ritualRunning}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-card-foreground hover:bg-foreground/5 disabled:opacity-50"
          >
            {w.wifiScanning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Buscar redes Wi-Fi
          </button>
        </div>

        <fieldset
          disabled={!w.usbConnected || w.wifiConnecting || ritualRunning}
          className="mt-4 space-y-3 disabled:opacity-60"
        >
          {w.wifiNetworks.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {w.wifiNetworks.map((net) => (
                <button
                  key={net.ssid}
                  type="button"
                  onClick={() => w.setWifiSsid(net.ssid)}
                  className={cn(
                    " rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    w.wifiSsid === net.ssid
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-background text-card-foreground hover:bg-foreground/5",
                  )}
                >
                  {net.ssid}
                  {net.signal != null ? (
                    <span className="ml-1.5 text-[11px] text-muted">
                      ({net.signal})
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">SSID (Red Wi-Fi)</span>
              <input
                type="text"
                value={w.wifiSsid}
                onChange={(e) => w.setWifiSsid(e.target.value)}
                placeholder="Nombre de la red"
                className={formFieldInputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Contraseña</span>
              <input
                type="password"
                value={w.wifiPassword}
                onChange={(e) => w.setWifiPassword(e.target.value)}
                placeholder="••••••••"
                className={formFieldInputClass}
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void w.connectWifi()}
                disabled={!w.wifiSsid.trim() || w.wifiConnecting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {w.wifiConnecting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wifi className="size-4" />
                )}
                Conectar Wi-Fi
              </button>
            </div>
          </div>
        </fieldset>
      </section>

      {/* PASO 3: Asignar Broker Nuevo */}
      <section
        className={cn(
          "rounded-xl border border-border bg-card p-5 shadow-sm transition-opacity",
          !w.usbConnected && "opacity-60",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <StepBadge
              done={w.isBrokerReady}
              active={w.usbConnected && !w.isBrokerReady}
              stepNumber={3}
            />
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-card-foreground">
                <Server className="size-4 text-accent" />
                3. Asignar broker MQTT nuevo
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                Apunta la impresora al broker actual (
                <span className="font-mono font-medium text-card-foreground">
                  {w.brokerConfig?.newBrokerHost ?? "206.189.231.128"}
                </span>
                ) antes de iniciar la fiscalización.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void w.configureBrokerOverUsb()}
              disabled={
                !w.usbConnected ||
                w.brokerStatus === "configuring_usb" ||
                w.brokerStatus === "configuring_fallback" ||
                ritualRunning
              }
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {w.brokerStatus === "configuring_usb" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Server className="size-4" />
              )}
              Configurar broker por USB
            </button>
          </div>
        </div>

        {w.brokerMessage ? (
          <p
            className={cn(
              "mt-3 rounded-lg border px-3 py-2 text-sm",
              w.isBrokerReady
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                : w.brokerStatus === "usb_failed_needs_fallback" ||
                    w.brokerStatus === "error"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                  : "border-border bg-foreground/[0.02] text-muted",
            )}
          >
            {w.brokerMessage}
          </p>
        ) : null}

        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowFallbackBroker((v) => !v)}
            className="text-xs font-medium text-muted hover:text-card-foreground hover:underline"
          >
            {showFallbackBroker || w.brokerStatus === "usb_failed_needs_fallback"
              ? "Ocultar método alternativo (vía broker antiguo)"
              : "¿No aceptó el cambio por USB? Usar método alternativo vía broker antiguo"}
          </button>

          {showFallbackBroker || w.brokerStatus === "usb_failed_needs_fallback" ? (
            <div className="mt-3 rounded-lg border border-border/80 bg-foreground/[0.02] p-3.5">
              <p className="text-xs text-muted">
                Si el firmware no acepta <code className="font-mono">configMqttAEG</code>{" "}
                por USB, el servidor puede enviarlo a través del broker antiguo de
                fábrica ({w.brokerConfig?.legacyBrokerHost ?? "13.51.138.105"}). Para
                ello la impresora debe estar conectada a Wi-Fi y necesitamos su MAC.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium">
                    Dirección MAC{" "}
                    {w.diagnostics.detectedMac
                      ? "(detectada por USB)"
                      : "(ingresar manualmente de la etiqueta)"}
                  </span>
                  <input
                    type="text"
                    value={w.diagnostics.detectedMac ?? w.manualMac}
                    onChange={(e) => w.setManualMac(e.target.value)}
                    disabled={
                      Boolean(w.diagnostics.detectedMac) ||
                      w.brokerStatus === "configuring_fallback"
                    }
                    placeholder="20:6E:F1:88:4C:68"
                    className={cn(formFieldInputClass, "font-mono")}
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => void w.configureBrokerViaFallback()}
                    disabled={
                      !w.effectiveMac ||
                      w.brokerStatus === "configuring_fallback" ||
                      ritualRunning
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-card-foreground hover:bg-foreground/5 disabled:opacity-50"
                  >
                    {w.brokerStatus === "configuring_fallback" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Asignar vía broker antiguo
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* PASO 4: Serial y Precinto */}
      <section
        className={cn(
          "rounded-xl border border-border bg-card p-5 shadow-sm transition-opacity",
          !w.usbConnected && "opacity-60",
        )}
      >
        <div className="flex items-start gap-3">
          <StepBadge
            done={w.precheckPassed}
            active={w.isBrokerReady && !w.precheckPassed}
            stepNumber={4}
          />
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <Stamp className="size-4 text-accent" />
              4. Serial y precinto fiscal
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Ingrese el serial de registro de la impresora nueva y seleccione (o cree)
              el precinto que se le instalará.
            </p>
          </div>
        </div>

        <fieldset
          disabled={ritualRunning || w.ritualPhase === "done"}
          className="mt-4 space-y-4 disabled:opacity-60"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                Serial de la impresora (Registro fiscal) *
              </span>
              <input
                type="text"
                value={w.ptrReg}
                onChange={(e) => w.setPtrReg(e.target.value.toUpperCase())}
                placeholder="GRA0000017"
                autoComplete="off"
                className={cn(formFieldInputClass, "font-mono uppercase")}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                MAC (opcional, para validar unicidad)
              </span>
              <input
                type="text"
                value={w.diagnostics.detectedMac ?? w.manualMac}
                onChange={(e) => w.setManualMac(e.target.value)}
                disabled={Boolean(w.diagnostics.detectedMac)}
                placeholder="20:6E:F1:88:4C:68"
                autoComplete="off"
                className={cn(formFieldInputClass, "font-mono")}
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Precinto disponible *</span>
              <button
                type="button"
                onClick={() => setShowNewSealForm((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <Plus className="size-3.5" />
                {showNewSealForm ? "Cancelar nuevo precinto" : "Crear nuevo precinto"}
              </button>
            </div>

            <SealSelect
              value={w.selectedSealId}
              onChange={w.setSelectedSealId}
              seals={w.availableSeals}
              disabled={w.sealsLoading}
              loading={w.sealsLoading}
              required={false}
              emptyLabel={
                w.availableSeals.length === 0
                  ? "No hay precintos disponibles — cree uno nuevo"
                  : "Seleccionar precinto disponible…"
              }
            />

            {showNewSealForm ? (
              <div className="mt-2 grid gap-3 rounded-lg border border-border/80 bg-foreground/[0.02] p-3.5 sm:grid-cols-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Serial del precinto</span>
                  <input
                    type="text"
                    value={w.newSealSerial}
                    onChange={(e) => w.setNewSealSerial(e.target.value.toUpperCase())}
                    placeholder="G1B0033"
                    className={cn(formFieldInputClass, "font-mono uppercase")}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Color</span>
                  <select
                    value={w.newSealColor}
                    onChange={(e) => w.setNewSealColor(e.target.value as SealColor)}
                    className={formFieldInputClass}
                  >
                    {SEAL_COLORS.map((c) => (
                      <option key={c} value={c}>
                        {SEAL_COLOR_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => void w.handleCreateSeal()}
                    disabled={!w.newSealSerial.trim() || w.creatingSeal}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
                  >
                    {w.creatingSeal ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Crear y seleccionar
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {w.precheckErrors.length > 0 ? (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-900 dark:text-rose-200"
            >
              <p className="font-semibold">No pasó la validación previa:</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {w.precheckErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => void w.runPrecheck()}
              disabled={
                !w.ptrReg.trim() ||
                !w.selectedSeal ||
                w.ritualPhase === "prechecking"
              }
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-card-foreground hover:bg-foreground/5 disabled:opacity-50"
            >
              {w.ritualPhase === "prechecking" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4 text-emerald-500" />
              )}
              Validar datos en servidor
            </button>
          </div>
        </fieldset>
      </section>

      {/* PASO 5: Confirmación y Fiscalización */}
      <section
        className={cn(
          "rounded-xl border border-border bg-card p-5 shadow-sm transition-opacity",
          (!w.isBrokerReady || !w.precheckPassed) &&
            w.ritualPhase === "idle" &&
            "opacity-60",
        )}
      >
        <div className="flex items-start gap-3">
          <StepBadge
            done={w.ritualPhase === "done"}
            active={w.isBrokerReady && w.precheckPassed && w.ritualPhase !== "done"}
            stepNumber={5}
          />
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <ShieldAlert className="size-4 text-accent" />
              5. Fiscalizar impresora y crear en base de datos
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Envía <code className="font-mono">ptrFiscalizarRemoto</code> por USB. La
              impresora notificará al broker nuevo y AEG Core creará el registro en
              estado <span className="font-semibold">SIN_ASIGNAR</span>.
            </p>
          </div>
        </div>

        {!w.isBrokerReady ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            El inicio de la fiscalización está bloqueado hasta confirmar en el Paso 3
            que la impresora apunta al broker nuevo.
          </p>
        ) : null}

        <div className="mt-4 space-y-4">
          <label className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <input
              type="checkbox"
              checked={w.irreversibleConfirmed}
              onChange={(e) => w.setIrreversibleConfirmed(e.target.checked)}
              disabled={
                !w.isBrokerReady ||
                !w.precheckPassed ||
                ritualRunning ||
                w.ritualPhase === "done"
              }
              className="mt-1 size-4 rounded border-border"
            />
            <span>
              Confirmo que el serial{" "}
              <strong className="font-mono">{w.ptrReg || "—"}</strong> y el precinto{" "}
              <strong className="font-mono">{w.selectedSeal?.serial ?? "—"}</strong> son
              correctos. Entiendo que la fiscalización graba en la memoria fiscal de la
              impresora y <strong>no se puede deshacer</strong>.
            </span>
          </label>

          {w.ritualError ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-900 dark:text-rose-200"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{w.ritualError}</span>
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void w.startFiscalizacion()}
              disabled={
                !w.usbConnected ||
                !w.isBrokerReady ||
                !w.precheckPassed ||
                !w.irreversibleConfirmed ||
                ritualRunning ||
                w.ritualPhase === "done"
              }
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {ritualRunning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldAlert className="size-4" />
              )}
              {ritualRunning
                ? "Fiscalizando impresora…"
                : "Fiscalizar impresora por USB"}
            </button>

            {w.ritualPhase === "done" || w.ritualPhase === "failed" ? (
              <button
                type="button"
                onClick={w.resetWizardForNewPrinter}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-card-foreground hover:bg-foreground/5"
              >
                Preparar otra impresora
              </button>
            ) : null}
          </div>

          {(ritualRunning ||
            w.ritualPhase === "done" ||
            w.ritualPhase === "failed") && (
            <div className="mt-4 space-y-3 rounded-lg border border-border p-4">
              <EnajenacionRitualStepper
                steps={w.flowSteps.map((s) => ({
                  id: s.id,
                  step: s.step,
                  name: s.name,
                  isRequest: s.isRequest,
                }))}
                stepStatuses={stepStatuses}
                activeStepIndex={activeStepIndex}
                displayStepIndex={activeStepIndex}
                onSelectStep={() => {}}
              />

              {w.ritualPhase === "done" ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-950 dark:text-emerald-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      Fiscalización completada. La impresora fue creada en estado{" "}
                      <strong>SIN_ASIGNAR</strong> y el precinto quedó{" "}
                      <strong>EN_IMPRESORA</strong>.
                    </span>
                  </div>
                  {w.sse.completedPrinterId != null ? (
                    <Link
                      href={printerPath(w.sse.completedPrinterId)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      Ver impresora creada
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
