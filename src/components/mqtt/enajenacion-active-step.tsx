"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import {
  EnajenacionStepDetails,
  SimulatePrinterButton,
} from "@/components/mqtt/enajenacion-step-actions";
import type { RitualStepActionState } from "@/hooks/use-enajenacion-ritual";
import type { RitualStep } from "@/hooks/use-enajenacion-ritual";
import { formatMqttPayloadForDisplay } from "@/lib/enajenacion-mqtt-protocol";
import { printerStatusLabel } from "@/lib/printer-status";
import { printerPath } from "@/lib/resource-routes";
import type { PrinterResponse } from "@/types/printer";
import { cn } from "@/lib/utils";

function formatPayload(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

export function EnajenacionActiveStep({
  step,
  stepState,
  onPublished,
  onReturnToCurrent,
  currentStepLabel,
  className,
}: {
  step: RitualStep;
  stepState: RitualStepActionState;
  onPublished: (stepId: string) => void;
  onReturnToCurrent?: () => void;
  currentStepLabel?: string;
  className?: string;
}) {
  const showSimulation =
    !stepState.locked &&
    stepState.status === "pending" &&
    stepState.simulation &&
    stepState.isActive;
  const payloadText = stepState.simulation
    ? formatPayload(stepState.simulation.payload)
    : "";
  const commandText = stepState.serverCommand?.payload
    ? formatMqttPayloadForDisplay(stepState.serverCommand.payload)
    : "";

  return (
    <article
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Paso {step.step}
      </p>
      <h3 className="mt-1 text-lg font-semibold text-card-foreground">
        {step.name}
      </h3>
      <p className="mt-2 text-sm text-muted">{stepState.contextLine}</p>

      {stepState.isReview && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          <span>Paso completado.</span>
          {onReturnToCurrent && currentStepLabel ? (
            <button
              type="button"
              onClick={onReturnToCurrent}
              className="font-medium text-accent hover:underline"
            >
              Volver al paso {currentStepLabel}
            </button>
          ) : null}
        </div>
      )}

      {!step.isRequest && (
        <div className="mt-4">
          <EnajenacionStepDetails
            label="Ver comando del servidor"
            copyText={commandText}
            copyLabel="Comando"
            emptyMessage="Aún no hay comando en Comando para este paso."
          />
        </div>
      )}

      {stepState.simulation ? (
        <div className={cn(!step.isRequest ? "mt-3" : "mt-4")}>
          <EnajenacionStepDetails
            label="Ver payload CmdServer"
            copyText={payloadText}
            copyLabel="Payload"
          />
        </div>
      ) : null}

      {showSimulation && (
        <div className="mt-5">
          <SimulatePrinterButton
            stepId={step.id}
            simulation={stepState.simulation!}
            disabled={stepState.simulateDisabled}
            disabledReason={stepState.simulateDisabledReason}
            onPublished={onPublished}
            fullWidth
          />
        </div>
      )}

      {stepState.isActive && stepState.status === "success" && step.isRequest && (
        <p className="mt-4 text-sm text-muted">
          Solicitud enviada. Continúa en el paso 2 cuando AEG Core publique el DNF.
        </p>
      )}
    </article>
  );
}

export function EnajenacionSuccessCard({
  printer,
  printerStatus,
}: {
  printer: PrinterResponse;
  printerStatus: PrinterResponse | null;
}) {
  const enajenada = printerStatus?.status === "enajenada";

  return (
    <article
      className={cn(
        "rounded-xl border p-6 shadow-sm",
        enajenada
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <CheckCircle2
          className={cn(
            "size-8 shrink-0",
            enajenada
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-accent",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-card-foreground">
            Ritual completado
          </h3>
          <p className="mt-1 text-sm text-muted">
            {enajenada
              ? "La impresora está marcada como Enajenada en AEG Core."
              : "Todos los pasos MQTT finalizaron. Comprueba el estado en BD."}
          </p>
          <p className="mt-2 text-sm">
            Estado actual:{" "}
            <strong className="font-medium text-card-foreground">
              {printerStatus
                ? printerStatusLabel(printerStatus.status)
                : "—"}
            </strong>
          </p>
          <Link
            href={printerPath(printer.id)}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
          >
            Ver impresora {printer.fiscalSerial}
            <ExternalLink className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
