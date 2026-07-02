"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import {
  EnajenacionStepDetails,
  PublishServerCommandButton,
  SimulatePrinterButton,
} from "@/components/mqtt/enajenacion-step-actions";
import type { RitualStep, RitualStepActionState } from "@/hooks/use-enajenacion-ritual";
import {
  ANNUAL_INSPECTION_CHECKLIST_ROWS,
  type AnnualInspectionChecklistKey,
  type AnnualInspectionChecklistState,
} from "@/lib/annual-inspection-mqtt-state";
import {
  annualInspectionServerCommandButtonLabel,
  annualInspectionSimulationButtonLabel,
} from "@/lib/annual-inspection-mqtt-simulator";
import {
  formatMqttPayloadForDisplay,
  invoiceProductDescriptionLimitLabel,
} from "@/lib/enajenacion-mqtt-protocol";
import { printerStatusLabel } from "@/lib/printer-status";
import { printerPath } from "@/lib/resource-routes";
import {
  formFieldInputClass,
  formFieldTextareaClass,
} from "@/lib/toggle-button-styles";
import type { PrinterResponse } from "@/types/printer";
import { cn } from "@/lib/utils";

function formatPayload(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

export function AnnualInspectionActiveStep({
  step,
  stepState,
  registroImpresora,
  numeroFacturaPrueba,
  productDescription,
  checklist,
  onChecklistChange,
  onProductDescriptionChange,
  onServerCommandPublished,
  onPublished,
  onChecklistContinue,
  onReturnToCurrent,
  currentStepLabel,
  className,
}: {
  step: RitualStep;
  stepState: RitualStepActionState;
  registroImpresora: string;
  numeroFacturaPrueba: number | null;
  productDescription: string;
  checklist: AnnualInspectionChecklistState;
  onChecklistChange: (key: AnnualInspectionChecklistKey, checked: boolean) => void;
  onProductDescriptionChange: (value: string) => void;
  onServerCommandPublished: (stepId: string) => void;
  onPublished: (stepId: string) => void;
  onChecklistContinue: () => void;
  onReturnToCurrent?: () => void;
  currentStepLabel?: string;
  className?: string;
}) {
  const showPublishCommand =
    step.id === "sta-inf" &&
    !step.isChecklist &&
    !stepState.locked &&
    stepState.status === "pending" &&
    stepState.serverCommandSimulation &&
    stepState.isActive &&
    !stepState.serverCommand;
  const showSimulation =
    !step.isChecklist &&
    !stepState.locked &&
    stepState.status === "pending" &&
    stepState.simulation &&
    stepState.isActive;
  const payloadText = stepState.simulation
    ? formatPayload(stepState.simulation.payload)
    : "";
  const commandText = stepState.serverCommand?.payload
    ? formatMqttPayloadForDisplay(stepState.serverCommand.payload)
    : stepState.serverCommandSimulation
      ? formatMqttPayloadForDisplay(
          JSON.stringify(stepState.serverCommandSimulation.payload),
        )
      : "";
  const acceptedResponseText = stepState.acceptedPrinterResponse?.payload
    ? formatMqttPayloadForDisplay(stepState.acceptedPrinterResponse.payload)
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

      {step.isChecklist ? (
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Registro de impresora
            </span>
            <input
              type="text"
              readOnly
              value={registroImpresora || "—"}
              className={cn(
                formFieldInputClass,
                "bg-foreground/[0.02] font-mono text-card-foreground",
              )}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">
              Descripción de producto (des01)
            </span>
            <textarea
              value={productDescription}
              onChange={(event) => onProductDescriptionChange(event.target.value)}
              rows={3}
              className={formFieldTextareaClass}
            />
            <span className="mt-1 block text-xs text-muted">
              {invoiceProductDescriptionLimitLabel(productDescription)} Se usa en la
              factura y nota de crédito de prueba.
            </span>
          </label>

          <div className="space-y-4">
            {ANNUAL_INSPECTION_CHECKLIST_ROWS.map((row) => (
              <fieldset
                key={row.key}
                className="space-y-2 rounded-lg border border-border/60 px-3 py-2.5"
              >
                <legend className="text-sm font-medium text-card-foreground">
                  {row.title}
                </legend>
                <label className="flex items-center gap-3">
                  <input
                    id={`annual-step-checklist-${row.key}-ok`}
                    type="radio"
                    name={`annual-step-checklist-${row.key}`}
                    checked={checklist[row.key]}
                    onChange={() => onChecklistChange(row.key, true)}
                    className="size-4 border-border"
                  />
                  <span className="text-sm text-card-foreground">{row.okLabel}</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    id={`annual-step-checklist-${row.key}-not-ok`}
                    type="radio"
                    name={`annual-step-checklist-${row.key}`}
                    checked={!checklist[row.key]}
                    onChange={() => onChecklistChange(row.key, false)}
                    className="size-4 border-border"
                  />
                  <span className="text-sm text-card-foreground">{row.notOkLabel}</span>
                </label>
              </fieldset>
            ))}
          </div>

          {numeroFacturaPrueba != null ? (
            <p className="text-sm text-muted">
              Número de factura de prueba:{" "}
              <span className="font-mono text-card-foreground">
                {numeroFacturaPrueba}
              </span>
            </p>
          ) : null}

          {stepState.isActive && stepState.status === "pending" ? (
            <button
              type="button"
              onClick={onChecklistContinue}
              className="flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90"
            >
              Continuar
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {acceptedResponseText ? (
              <EnajenacionStepDetails
                label="Respuesta de impresora aceptada (Respuesta)"
                copyText={acceptedResponseText}
                copyLabel="Respuesta"
              />
            ) : null}
            <EnajenacionStepDetails
              label="Comando del servidor (Comando)"
              copyText={commandText}
              copyLabel="Comando"
              emptyMessage="Aún no hay comando en Comando para este paso."
            />
          </div>

          {stepState.simulation ? (
            <div className="mt-3">
              <EnajenacionStepDetails
                label="Ver payload Respuesta"
                copyText={payloadText}
                copyLabel="Payload"
              />
            </div>
          ) : null}

          {showPublishCommand && (
            <div className="mt-5">
              <PublishServerCommandButton
                stepId={step.id}
                simulation={stepState.serverCommandSimulation!}
                disabled={stepState.publishDisabled}
                disabledReason={stepState.publishDisabledReason}
                onPublished={onServerCommandPublished}
                buttonLabel={annualInspectionServerCommandButtonLabel(step.id)}
                fullWidth
              />
            </div>
          )}

          {showSimulation && (
            <div className="mt-5">
              <SimulatePrinterButton
                stepId={step.id}
                simulation={stepState.simulation!}
                disabled={stepState.simulateDisabled}
                disabledReason={stepState.simulateDisabledReason}
                onPublished={onPublished}
                buttonLabel={annualInspectionSimulationButtonLabel(step.id)}
                fullWidth
              />
            </div>
          )}
        </>
      )}
    </article>
  );
}

export function AnnualInspectionSuccessCard({
  printer,
  registroImpresora,
  numeroFacturaPrueba,
}: {
  printer: PrinterResponse;
  registroImpresora: string;
  numeroFacturaPrueba: number | null;
}) {
  return (
    <article className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <CheckCircle2
          className="size-8 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-card-foreground">
            Ritual completado
          </h3>
          <p className="mt-1 text-sm text-muted">
            Todos los pasos Remoto finalizaron. Esta pestaña no persiste en BD —
            use el libro fiscal para registros oficiales.
          </p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted">Estado impresora:</dt>
              <dd className="font-medium text-card-foreground">
                {printerStatusLabel(printer.status)}
              </dd>
            </div>
            {registroImpresora ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">Registro Remoto:</dt>
                <dd className="font-mono">{registroImpresora}</dd>
              </div>
            ) : null}
            {numeroFacturaPrueba != null ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">Factura de prueba:</dt>
                <dd className="font-mono">{numeroFacturaPrueba}</dd>
              </div>
            ) : null}
          </dl>
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
