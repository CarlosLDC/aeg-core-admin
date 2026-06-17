"use client";

import { Loader2, Printer, RefreshCw, RotateCcw, Zap } from "lucide-react";
import { useToast } from "@/context/toast-provider";
import {
  EnajenacionActiveStep,
  EnajenacionSuccessCard,
} from "@/components/mqtt/enajenacion-active-step";
import { EnajenacionRitualStepper } from "@/components/mqtt/enajenacion-ritual-stepper";
import { useEnajenacionRitual } from "@/hooks/use-enajenacion-ritual";
import {
  getMqttErrorMessage,
  updateMqttSubscription,
} from "@/lib/mqtt-api";
import { printerStatusLabel } from "@/lib/printer-status";
import type { MqttInboundMessage } from "@/types/mqtt";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/20";

function formatAnchorTime(anchorAt: number): string {
  return new Date(anchorAt).toLocaleString();
}

export function EnajenacionTestPanel({
  liveMessages,
  onApplyMonitorTopic,
}: {
  liveMessages: MqttInboundMessage[];
  onApplyMonitorTopic?: (topic: string) => Promise<void>;
  onOpenMonitor?: () => void;
}) {
  const toast = useToast();
  const ritual = useEnajenacionRitual(liveMessages);

  async function handleApplyMonitorTopic() {
    if (!ritual.topics) return;
    try {
      if (onApplyMonitorTopic) {
        await onApplyMonitorTopic(ritual.topics.monitor);
      } else {
        await updateMqttSubscription(ritual.topics.monitor);
      }
      toast.success(`Monitor apuntando a ${ritual.topics.monitor}`);
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    }
  }

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
        <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <Printer className="size-5 text-accent" />
          Enajenación MQTT
        </h2>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">Impresora</span>
          <select
            value={ritual.selectedId}
            onChange={(e) => ritual.handlePrinterChange(e.target.value)}
            className={inputClass}
          >
            {ritual.eligiblePrinters.length === 0 ? (
              <option value="">No hay impresoras aptas</option>
            ) : (
              ritual.eligiblePrinters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fiscalSerial} · cliente #{p.clientId}
                </option>
              ))
            )}
          </select>
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
        <>
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
            />
          ) : null}
        </>
      ) : null}

      {ritual.activePrinter && ritual.topics ? (
        <footer className="space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap gap-2">
            {onApplyMonitorTopic && (
              <button
                type="button"
                onClick={() => void handleApplyMonitorTopic()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-foreground/5"
              >
                <Zap className="size-3.5" />
                Monitor fiscal
              </button>
            )}
            <button
              type="button"
              onClick={ritual.handleResetTracking}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-foreground/5"
            >
              <RotateCcw className="size-3.5" />
              Reiniciar
            </button>
            <button
              type="button"
              onClick={() => void ritual.refreshPrinterStatus(ritual.activePrinter!.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-foreground/5"
            >
              <RefreshCw className="size-3.5" />
              Actualizar estado
            </button>
          </div>

          <details className="rounded-lg border border-border text-sm">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted">
              Detalles técnicos
            </summary>
            <dl className="grid gap-2 border-t border-border px-3 py-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted">MAC</dt>
                <dd className="font-mono break-all">{ritual.activePrinter.macAddress}</dd>
              </div>
              <div>
                <dt className="text-muted">CmdServer</dt>
                <dd className="font-mono break-all">{ritual.topics.cmdServer}</dd>
              </div>
              <div>
                <dt className="text-muted">Comando</dt>
                <dd className="font-mono break-all">{ritual.topics.comando}</dd>
              </div>
              <div>
                <dt className="text-muted">Monitor</dt>
                <dd className="font-mono break-all">{ritual.topics.monitor}</dd>
              </div>
              {ritual.ritualAnchorAt !== null ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Sesión anclada</dt>
                  <dd>{formatAnchorTime(ritual.ritualAnchorAt)}</dd>
                </div>
              ) : null}
            </dl>
          </details>
        </footer>
      ) : null}
    </div>
  );
}
