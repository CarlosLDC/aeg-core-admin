"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Play } from "lucide-react";
import { ToolsPrinterMacGuard } from "@/components/tools/tools-printer-sub-page";
import {
  ToolsPage,
  ToolsSectionHeading,
  ToolsPanelSection,
  ToolsActionButton,
  ToolsPanelActions,
} from "@/components/tools/tools-ui";
import { TOOLS_SECTIONS } from "@/lib/tools-sections";
import type { ToolsPrinter } from "@/modules/tools/shared/types";
import { useBrokerMigration, type MigrationPhase, type MigrationState } from "./use-broker-migration";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";

interface BrokerMigrationPanelProps {
  printer: ToolsPrinter;
}

/** Orden lineal del flujo; se usa para saber qué pasos ya se completaron. */
const PHASE_ORDER: MigrationPhase[] = [
  'checking-firmware',
  'firmware-checked',
  'updating-firmware',
  'waiting-reboot',
  'verifying-firmware',
  'checking-broker',
  'broker-checked',
  'configuring-broker',
  'done',
];

function phaseRank(phase: MigrationPhase | undefined): number {
  if (!phase) return -1;
  if (phase === 'already-migrated') return PHASE_ORDER.indexOf('broker-checked');
  if (phase === 'uncertain') return PHASE_ORDER.indexOf('done');
  return PHASE_ORDER.indexOf(phase);
}

type StepStatus = 'pending' | 'active' | 'completed' | 'error' | 'warning';

function stepStatus(state: MigrationState, activePhases: MigrationPhase[], lastPhase: MigrationPhase): StepStatus {
  if (state.phase === 'error') {
    if (state.failedPhase && activePhases.includes(state.failedPhase)) return 'error';
    return phaseRank(state.failedPhase) > phaseRank(lastPhase) ? 'completed' : 'pending';
  }
  if (activePhases.includes(state.phase)) return 'active';
  return phaseRank(state.phase) > phaseRank(lastPhase) ? 'completed' : 'pending';
}

const STATUS_TEXT: Partial<Record<MigrationPhase, string>> = {
  'checking-firmware': "Verificando firmware...",
  'firmware-checked': "Firmware verificado. Requiere confirmación.",
  'updating-firmware': "Enviando actualización de firmware...",
  'waiting-reboot': "Esperando reinicio de la impresora...",
  'verifying-firmware': "Confirmando nueva versión de firmware...",
  'checking-broker': "Verificando broker actual...",
  'broker-checked': "La impresora está en el broker antiguo. Requiere confirmación.",
  'configuring-broker': "Enviando credenciales del broker nuevo...",
  'done': "Migración completada exitosamente.",
  'already-migrated': "La impresora ya está conectada al broker nuevo.",
  'uncertain': "El resultado de la migración es incierto.",
};

function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'error':
      return <XCircle className="size-5 text-destructive" />;
    case 'warning':
      return <AlertTriangle className="size-5 text-amber-500" />;
    case 'completed':
      return <CheckCircle2 className="size-5 text-emerald-500" />;
    case 'active':
      return <Clock className="size-5 text-sky-500 animate-pulse" />;
    default:
      return <div className="size-2 rounded-full bg-border m-1.5" />;
  }
}

function Step({ status, title, children }: { status: StepStatus; title: string; children?: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0">
        <StatusIcon status={status} />
      </div>
      <div className="flex-1">
        <p className={cn("text-sm font-medium", status === 'pending' ? "text-muted" : "text-foreground")}>{title}</p>
        {children}
      </div>
    </li>
  );
}

export function BrokerMigrationPanel({ printer }: BrokerMigrationPanelProps) {
  const section = TOOLS_SECTIONS.brokerMigration;
  const [rebootWaitSeconds, setRebootWaitSeconds] = useState<number>(60);

  const { state, startMigration, confirmContinue, recheckBroker, reset } = useBrokerMigration(
    printer.id,
    rebootWaitSeconds,
  );

  const effectivePhase = state.phase === 'error' ? state.failedPhase : state.phase;
  const reached = (phase: MigrationPhase) => phaseRank(effectivePhase) >= phaseRank(phase);

  const firmwareStep = stepStatus(state, ['checking-firmware'], 'checking-firmware');
  const updateStep = stepStatus(state, ['updating-firmware'], 'updating-firmware');
  const rebootStep = stepStatus(state, ['waiting-reboot', 'verifying-firmware'], 'verifying-firmware');
  const brokerStep = stepStatus(state, ['checking-broker'], 'checking-broker');
  const configStep: StepStatus =
    state.phase === 'uncertain' ? 'warning' : stepStatus(state, ['configuring-broker'], 'configuring-broker');

  const showUpdateSteps = state.needsFirmwareUpdate || state.firmwareUpdated;
  const isFinished = state.phase === 'done' || state.phase === 'already-migrated' || state.phase === 'uncertain';

  return (
    <ToolsPrinterMacGuard macAddress={printer.macAddress}>
      <ToolsPage>
        <ToolsSectionHeading
          icon={section.icon}
          tone={section.tone}
          title={section.title}
          description={section.description}
        />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Controls Panel */}
          <ToolsPanelSection
            title="Control de Migración"
            description="Inicie el proceso manual para migrar esta impresora al nuevo broker MQTT."
            icon={Play}
            tone="sky"
          >
            {state.phase === 'idle' || state.phase === 'error' ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-muted">Tiempo de espera tras reinicio (segundos)</span>
                  <select
                    value={rebootWaitSeconds}
                    onChange={(e) => setRebootWaitSeconds(Number(e.target.value))}
                    className={formFieldInputClass}
                  >
                    <option value={30}>30s</option>
                    <option value={45}>45s</option>
                    <option value={60}>60s (Recomendado)</option>
                    <option value={90}>90s</option>
                    <option value={120}>120s</option>
                  </select>
                </label>

                {state.errorMessage && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 flex gap-2 items-start">
                    <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                    <p>{state.errorMessage}</p>
                  </div>
                )}

                <ToolsPanelActions>
                  <ToolsActionButton onClick={startMigration} variant="primary">
                    {state.phase === 'error' ? 'Reintentar migración' : 'Iniciar migración'}
                  </ToolsActionButton>
                </ToolsPanelActions>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Estado actual</h4>
                  <p className="text-sm text-muted">{STATUS_TEXT[state.phase]}</p>
                </div>

                {(state.phase === 'firmware-checked' || state.phase === 'broker-checked') && (
                  <ToolsPanelActions>
                    <ToolsActionButton onClick={confirmContinue} variant="primary">
                      {state.phase === 'firmware-checked'
                        ? state.needsFirmwareUpdate
                          ? 'Actualizar firmware'
                          : 'Verificar broker'
                        : 'Migrar al broker nuevo'}
                    </ToolsActionButton>
                  </ToolsPanelActions>
                )}

                {isFinished && (
                  <ToolsPanelActions>
                    {state.phase === 'uncertain' && (
                      <ToolsActionButton onClick={recheckBroker} variant="primary">
                        Verificar broker nuevamente
                      </ToolsActionButton>
                    )}
                    <ToolsActionButton onClick={reset}>Reiniciar panel</ToolsActionButton>
                  </ToolsPanelActions>
                )}
              </div>
            )}
          </ToolsPanelSection>

          {/* Progress Panel */}
          {state.phase !== 'idle' && (
            <ToolsPanelSection
              title="Progreso"
              description="Siga el avance de las operaciones."
              icon={Clock}
              tone="slate"
            >
              <ul className="space-y-4">
                <Step status={firmwareStep} title="1. Verificar versión de firmware">
                  {state.firmwareVersion && (
                    <p className="text-sm text-muted mt-1">
                      Versión actual: <span className="font-semibold">{state.firmwareVersion}</span>
                      {state.needsFirmwareUpdate === false && " (credenciales del servidor nuevo)"}
                      {state.needsFirmwareUpdate === true && " (credenciales del servidor antiguo)"}
                    </p>
                  )}
                </Step>

                {showUpdateSteps && (
                  <Step status={updateStep} title="2. Actualizar firmware">
                    {state.infoMessage && state.firmwareUpdated && reached('waiting-reboot') && (
                      <p className="text-xs text-muted mt-1">{state.infoMessage}</p>
                    )}
                  </Step>
                )}

                {showUpdateSteps && reached('waiting-reboot') && (
                  <Step status={rebootStep} title="3. Esperar reinicio y confirmar firmware">
                    {state.phase === 'waiting-reboot' && state.rebootCountdown !== undefined && (
                      <div className="mt-2 space-y-1">
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 transition-all duration-1000 ease-linear"
                            style={{ width: `${(state.rebootCountdown / rebootWaitSeconds) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-right text-muted">{state.rebootCountdown}s restantes</p>
                      </div>
                    )}
                  </Step>
                )}

                {reached('checking-broker') && (
                  <Step status={brokerStep} title="4. Verificar broker actual">
                    {state.currentBrokerHost && brokerStep === 'completed' && (
                      <p className="text-sm text-muted mt-1">
                        Host actual: <span className="font-semibold">{state.currentBrokerHost}</span>
                        {state.isOldBroker ? " (antiguo)" : " (nuevo)"}
                      </p>
                    )}
                  </Step>
                )}

                {reached('configuring-broker') && state.phase !== 'already-migrated' && (
                  <Step status={configStep} title="5. Configurar nuevo broker" />
                )}
              </ul>

              {/* Final outcome banner */}
              {isFinished && (
                <div
                  className={cn(
                    "mt-6 p-4 rounded-md border",
                    state.phase === 'uncertain'
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-700"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700",
                  )}
                >
                  <div className="flex gap-3">
                    {state.phase === 'uncertain' ? (
                      <AlertTriangle className="size-5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="size-5 shrink-0" />
                    )}
                    <div className="text-sm">
                      <p className="font-medium">
                        {state.phase === 'done' && "Migración exitosa"}
                        {state.phase === 'already-migrated' && "La impresora ya apunta al servidor nuevo"}
                        {state.phase === 'uncertain' && "Resultado incierto"}
                      </p>
                      {state.phase === 'done' && state.infoMessage && (
                        <p className="mt-1 opacity-90">{state.infoMessage}</p>
                      )}
                      {state.phase === 'uncertain' && (
                        <p className="mt-1 opacity-90">
                          {state.errorMessage ||
                            "No se pudo confirmar si la migración se realizó. Verifique el broker nuevamente o revise la impresora físicamente."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </ToolsPanelSection>
          )}
        </div>
      </ToolsPage>
    </ToolsPrinterMacGuard>
  );
}
