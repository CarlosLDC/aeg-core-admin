"use client";

import { useMemo, useState } from "react";
import { Info, Loader2, Printer } from "lucide-react";
import {
  AnnualInspectionActiveStep,
  AnnualInspectionSuccessCard,
} from "@/components/mqtt/annual-inspection-active-step";
import { EnajenacionRitualStepper } from "@/components/mqtt/enajenacion-ritual-stepper";
import { EnajenacionTechnicalDetailsModal } from "@/components/mqtt/enajenacion-technical-details-modal";
import { PrinterSelect } from "@/components/printers/printer-select";
import { useAnnualInspectionRitual } from "@/hooks/use-annual-inspection-ritual";
import { printerStatusLabel } from "@/lib/printer-status";
import { cn } from "@/lib/utils";

export function AnnualInspectionMqttPanel() {
  const [technicalDetailsOpen, setTechnicalDetailsOpen] = useState(false);
  const ritual = useAnnualInspectionRitual();

  const printerOptions = useMemo(
    () =>
      ritual.eligiblePrinters.map((p) => {
        const clientName = ritual.getClientName(p.clientId);
        return {
          id: p.id,
          label: `${p.fiscalSerial} · ${clientName}`,
          serial: p.fiscalSerial,
          searchText: `${p.id} ${p.fiscalSerial} ${p.macAddress} ${clientName} ${p.clientId ?? ""}`,
        };
      }),
    [ritual.eligiblePrinters, ritual.getClientName],
  );

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
            Inspección anual MQTT
          </h2>
          {ritual.activePrinter && ritual.topics ? (
            <button
              type="button"
              onClick={() => setTechnicalDetailsOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-foreground/5"
            >
              <Info className="size-3.5" />
              Detalles técnicos
            </button>
          ) : null}
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

        {ritual.activePrinter && ritual.printerStatus ? (
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
            {ritual.commandContextLoading ? (
              <span className="text-xs text-muted">Cargando datos fiscales…</span>
            ) : ritual.commandContextError ? (
              <span className="text-xs text-rose-700 dark:text-rose-300">
                {ritual.commandContextError}
              </span>
            ) : ritual.topics ? (
              <span className="text-xs text-emerald-700 dark:text-emerald-300">
                Lista para inspección
              </span>
            ) : null}
          </div>
        ) : null}

        {ritual.commandContextError ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-950 dark:text-rose-100"
          >
            {ritual.commandContextError}
          </p>
        ) : null}
      </section>

      {ritual.eligiblePrinters.length === 0 ? (
        <p className="text-sm text-muted">
          No hay impresoras enajenadas con serial, MAC y cliente configurados.
        </p>
      ) : null}

      {ritual.ritualComplete && ritual.activePrinter ? (
        <AnnualInspectionSuccessCard
          printer={ritual.activePrinter}
          registroImpresora={ritual.registroImpresora}
          numeroFacturaPrueba={ritual.numeroFacturaPrueba}
        />
      ) : null}

      {ritual.ritualSteps.length > 0 && !ritual.ritualComplete ? (
        <div className="space-y-4">
          <EnajenacionRitualStepper
            steps={ritual.ritualSteps}
            stepStatuses={ritual.stepStatuses}
            activeStepIndex={ritual.activeStepIndex}
            displayStepIndex={ritual.displayStepIndex}
            onSelectStep={ritual.handleStepperSelect}
          />

          {ritual.displayedStep && ritual.displayedStepState ? (
            <AnnualInspectionActiveStep
              className="mb-4"
              step={ritual.displayedStep}
              stepState={ritual.displayedStepState}
              registroImpresora={ritual.registroImpresora}
              numeroFacturaPrueba={ritual.numeroFacturaPrueba}
              productDescription={ritual.productDescription}
              checklist={ritual.checklist}
              onChecklistChange={ritual.handleChecklistChange}
              onProductDescriptionChange={ritual.handleProductDescriptionChange}
              onServerCommandPublished={ritual.handleServerCommandPublished}
              onPublished={ritual.handleStepPublished}
              onChecklistContinue={ritual.handleChecklistContinue}
              onReturnToCurrent={() =>
                ritual.handleStepperSelect(ritual.activeStepIndex)
              }
              currentStepLabel={
                ritual.ritualSteps[ritual.activeStepIndex]?.step
              }
            />
          ) : null}
        </div>
      ) : null}

      {ritual.activePrinter && ritual.topics ? (
        <EnajenacionTechnicalDetailsModal
          open={technicalDetailsOpen}
          onClose={() => setTechnicalDetailsOpen(false)}
          printer={ritual.activePrinter}
          clientName={ritual.getClientName(ritual.activePrinter.clientId)}
          topics={ritual.topics}
          sessionStartedAt={ritual.sessionStartedAt}
        />
      ) : null}
    </div>
  );
}
