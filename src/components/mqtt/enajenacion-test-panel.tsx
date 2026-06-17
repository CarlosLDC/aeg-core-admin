"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, Loader2, Printer, RefreshCw, RotateCcw } from "lucide-react";
import {
  EnajenacionActiveStep,
  EnajenacionSuccessCard,
} from "@/components/mqtt/enajenacion-active-step";
import { EnajenacionRitualStepper } from "@/components/mqtt/enajenacion-ritual-stepper";
import { EnajenacionTechnicalDetailsModal } from "@/components/mqtt/enajenacion-technical-details-modal";
import { PrinterSelect } from "@/components/printers/printer-select";
import { useEnajenacionRitual } from "@/hooks/use-enajenacion-ritual";
import type { MqttWsStatus } from "@/hooks/use-mqtt-monitor";
import { printerStatusLabel } from "@/lib/printer-status";
import type { MqttInboundMessage } from "@/types/mqtt";
import { cn } from "@/lib/utils";

export function EnajenacionTestPanel({
  liveMessages,
  monitorTopic,
  wsStatus,
  subscribeToMonitor,
  connectMonitorWebSocket,
  monitorSyncEnabled = false,
}: {
  liveMessages: MqttInboundMessage[];
  monitorTopic: string;
  wsStatus: MqttWsStatus;
  subscribeToMonitor: (topic: string) => Promise<void>;
  connectMonitorWebSocket: () => void;
  monitorSyncEnabled?: boolean;
}) {
  const [technicalDetailsOpen, setTechnicalDetailsOpen] = useState(false);
  const ritual = useEnajenacionRitual(liveMessages);

  const printerOptions = useMemo(
    () =>
      ritual.eligiblePrinters.map((p) => ({
        id: p.id,
        label: `${p.fiscalSerial} · cliente #${p.clientId}`,
        serial: p.fiscalSerial,
        searchText: `${p.id} ${p.fiscalSerial} ${p.macAddress} ${p.clientId}`,
      })),
    [ritual.eligiblePrinters],
  );

  useEffect(() => {
    if (!monitorSyncEnabled) return;

    const target = ritual.topics?.monitor.trim();
    if (!target || !ritual.activePrinter) return;

    if (monitorTopic.trim() === target) {
      if (wsStatus !== "open") {
        connectMonitorWebSocket();
      }
      return;
    }

    void subscribeToMonitor(target).catch(() => undefined);
  }, [
    monitorSyncEnabled,
    ritual.activePrinter?.id,
    ritual.topics?.monitor,
    monitorTopic,
    wsStatus,
    subscribeToMonitor,
    connectMonitorWebSocket,
  ]);

  if (ritual.printersLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" />
        Cargando impresoras…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
            <Printer className="size-5 text-accent" />
            Enajenación MQTT
          </h2>
          {ritual.activePrinter && (
            <div className="flex shrink-0 items-center gap-2">
              {ritual.topics ? (
                <button
                  type="button"
                  onClick={() => setTechnicalDetailsOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-foreground/5"
                >
                  <Info className="size-3.5" />
                  Detalles técnicos
                </button>
              ) : null}
              <button
                type="button"
                onClick={ritual.handleResetTracking}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-foreground/5"
              >
                <RotateCcw className="size-3.5" />
                Reiniciar
              </button>
            </div>
          )}
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">Impresora</span>
          <PrinterSelect
            value={ritual.selectedId === "" ? "" : String(ritual.selectedId)}
            onChange={ritual.handlePrinterChange}
            options={printerOptions}
            loading={ritual.printersLoading}
            emptyLabel="No hay impresoras aptas"
            searchPlaceholder="Buscar por serial, MAC o cliente…"
            preloadOptions
            required
          />
        </label>

        {ritual.activePrinter && ritual.printerStatus && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                ritual.printerStatus.status === "enajenada"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-foreground/5 text-muted",
              )}
            >
              {printerStatusLabel(ritual.printerStatus.status)}
            </span>
            {ritual.precheckLoading ? (
              <span className="text-xs text-muted">Validando…</span>
            ) : ritual.precheck && !ritual.precheck.ready ? (
              <span className="text-xs text-rose-700 dark:text-rose-300">
                {ritual.precheck.message}
              </span>
            ) : ritual.precheck?.ready ? (
              <span className="text-xs text-emerald-700 dark:text-emerald-300">
                Lista para enajenar
              </span>
            ) : null}
          </div>
        )}

        {ritual.precheck && !ritual.precheck.ready && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-950 dark:text-rose-100"
          >
            {ritual.precheck.message}
          </p>
        )}
      </section>

      {ritual.eligiblePrinters.length === 0 && (
        <p className="text-sm text-muted">
          No hay impresoras aptas (asignada o laboratorio, con cliente, serial y
          MAC).
        </p>
      )}

      {ritual.ritualComplete && ritual.activePrinter ? (
        <EnajenacionSuccessCard
          printer={ritual.activePrinter}
          printerStatus={ritual.printerStatus}
        />
      ) : null}

      {ritual.ritualSteps.length > 0 && !ritual.ritualComplete ? (
        <section className="space-y-4">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                if (wsStatus !== "open") {
                  connectMonitorWebSocket();
                }
                void ritual.refreshStepLiveData();
              }}
              disabled={ritual.stepRefreshLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-foreground/5 disabled:opacity-50"
            >
              <RefreshCw
                className={cn(
                  "size-3.5",
                  ritual.stepRefreshLoading && "animate-spin",
                )}
                aria-hidden
              />
              Actualizar comandos
            </button>
          </div>

          <EnajenacionRitualStepper
            steps={ritual.ritualSteps}
            stepStatuses={ritual.stepStatuses}
            activeStepIndex={ritual.activeStepIndex}
            displayStepIndex={ritual.displayStepIndex}
            onSelectStep={ritual.handleStepperSelect}
          />

          {ritual.displayedStep && ritual.displayedStepState ? (
            <EnajenacionActiveStep
              step={ritual.displayedStep}
              stepState={ritual.displayedStepState}
              onPublished={ritual.handleStepPublished}
              onReturnToCurrent={() =>
                ritual.handleStepperSelect(ritual.activeStepIndex)
              }
              onAdvanceToNext={ritual.handleAdvanceToNextStep}
              canAdvanceToNext={ritual.canAdvanceFromDisplayedStep}
              currentStepLabel={
                ritual.ritualSteps[ritual.activeStepIndex]?.step
              }
            />
          ) : null}
        </section>
      ) : null}

      {ritual.activePrinter && ritual.topics ? (
        <EnajenacionTechnicalDetailsModal
          open={technicalDetailsOpen}
          onClose={() => setTechnicalDetailsOpen(false)}
          printer={ritual.activePrinter}
          topics={ritual.topics}
          ritualAnchorAt={ritual.ritualAnchorAt}
        />
      ) : null}
    </div>
  );
}
