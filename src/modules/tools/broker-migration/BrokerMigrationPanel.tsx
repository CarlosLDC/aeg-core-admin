"use client";

import { useState } from "react";
import { Server, CheckCircle2, XCircle, Clock, AlertTriangle, Play } from "lucide-react";
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
import { useBrokerMigration, type MigrationPhase } from "./use-broker-migration";
import { formFieldInputClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";

interface BrokerMigrationPanelProps {
  printer: ToolsPrinter;
}

export function BrokerMigrationPanel({ printer }: BrokerMigrationPanelProps) {
  const section = TOOLS_SECTIONS.brokerMigration;
  const [rebootWaitSeconds, setRebootWaitSeconds] = useState<number>(60);
  
  const { state, startMigration, confirmContinue, reset } = useBrokerMigration(
    printer.id,
    rebootWaitSeconds
  );

  const renderStatusIcon = (isActive: boolean, isCompleted: boolean, isError: boolean) => {
    if (isError) return <XCircle className="size-5 text-destructive" />;
    if (isCompleted) return <CheckCircle2 className="size-5 text-emerald-500" />;
    if (isActive) return <Clock className="size-5 text-sky-500 animate-pulse" />;
    return <div className="size-2 rounded-full bg-border m-1.5" />;
  };

  const isCheckingFirmware = state.phase === 'checking-firmware';
  const isFirmwareChecked = state.phase === 'firmware-checked' || ['updating-firmware', 'waiting-reboot', 'checking-broker', 'broker-checked', 'configuring-broker', 'done', 'uncertain'].includes(state.phase);
  
  const isUpdatingFirmware = state.phase === 'updating-firmware';
  const isFirmwareUpdated = ['waiting-reboot', 'checking-broker', 'broker-checked', 'configuring-broker', 'done', 'uncertain'].includes(state.phase);
  
  const isWaitingReboot = state.phase === 'waiting-reboot';
  const isRebootDone = ['checking-broker', 'broker-checked', 'configuring-broker', 'done', 'uncertain'].includes(state.phase);
  
  const isCheckingBroker = state.phase === 'checking-broker';
  const isBrokerChecked = state.phase === 'broker-checked' || ['configuring-broker', 'done', 'uncertain'].includes(state.phase);
  
  const isConfiguringBroker = state.phase === 'configuring-broker';
  const isDone = state.phase === 'done' || state.phase === 'uncertain';

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
                  <ToolsActionButton
                    onClick={startMigration}
                    variant="primary"
                  >
                    {state.phase === 'error' ? 'Reintentar migración' : 'Iniciar migración'}
                  </ToolsActionButton>
                </ToolsPanelActions>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Estado actual</h4>
                  <p className="text-sm text-muted">
                    {state.phase === 'checking-firmware' && "Verificando firmware..."}
                    {state.phase === 'firmware-checked' && "Firmware verificado. Requiere confirmación."}
                    {state.phase === 'updating-firmware' && "Actualizando firmware..."}
                    {state.phase === 'waiting-reboot' && "Esperando reinicio de la impresora..."}
                    {state.phase === 'checking-broker' && "Verificando broker actual..."}
                    {state.phase === 'broker-checked' && "Broker verificado. Requiere confirmación."}
                    {state.phase === 'configuring-broker' && "Configurando nuevo broker..."}
                    {state.phase === 'done' && "Migración completada exitosamente."}
                    {state.phase === 'uncertain' && "El resultado de la migración es incierto."}
                  </p>
                </div>

                {(state.phase === 'firmware-checked' || state.phase === 'broker-checked') && (
                  <ToolsPanelActions>
                    <ToolsActionButton onClick={confirmContinue} variant="primary">
                      Continuar al siguiente paso
                    </ToolsActionButton>
                  </ToolsPanelActions>
                )}

                {isDone && (
                  <ToolsPanelActions>
                    <ToolsActionButton onClick={reset}>
                      Reiniciar panel
                    </ToolsActionButton>
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
                {/* 1. Check firmware */}
                <li className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {renderStatusIcon(isCheckingFirmware, isFirmwareChecked, state.phase === 'error' && isCheckingFirmware)}
                  </div>
                  <div>
                    <p className={cn("text-sm font-medium", isFirmwareChecked ? "text-foreground" : "text-muted")}>
                      1. Verificar versión de firmware
                    </p>
                    {isFirmwareChecked && state.firmwareVersion && (
                      <p className="text-sm text-muted mt-1">
                        Versión actual: <span className="font-semibold">{state.firmwareVersion}</span>
                        {state.needsFirmwareUpdate === false && " (Actualizado)"}
                      </p>
                    )}
                  </div>
                </li>

                {/* 2. Update firmware (Conditional) */}
                {(state.needsFirmwareUpdate || isUpdatingFirmware || isFirmwareUpdated) && (
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {renderStatusIcon(isUpdatingFirmware, isFirmwareUpdated, state.phase === 'error' && isUpdatingFirmware)}
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", isFirmwareUpdated || isUpdatingFirmware ? "text-foreground" : "text-muted")}>
                        2. Actualizar firmware
                      </p>
                    </div>
                  </li>
                )}

                {/* 3. Wait reboot */}
                {(isWaitingReboot || isRebootDone) && (
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {renderStatusIcon(isWaitingReboot, isRebootDone, false)}
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-sm font-medium", isWaitingReboot || isRebootDone ? "text-foreground" : "text-muted")}>
                        3. Esperar reinicio
                      </p>
                      {isWaitingReboot && state.rebootCountdown !== undefined && (
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
                    </div>
                  </li>
                )}

                {/* 4. Check broker */}
                {(isCheckingBroker || isBrokerChecked) && (
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {renderStatusIcon(isCheckingBroker, isBrokerChecked, state.phase === 'error' && isCheckingBroker)}
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", isBrokerChecked || isCheckingBroker ? "text-foreground" : "text-muted")}>
                        4. Verificar broker actual
                      </p>
                      {isBrokerChecked && state.currentBrokerHost && (
                        <p className="text-sm text-muted mt-1">
                          Host actual: <span className="font-semibold">{state.currentBrokerHost}</span>
                        </p>
                      )}
                    </div>
                  </li>
                )}

                {/* 5. Configure broker */}
                {(isConfiguringBroker || isDone) && (
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {renderStatusIcon(isConfiguringBroker, isDone, state.phase === 'error' && isConfiguringBroker)}
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", isConfiguringBroker || isDone ? "text-foreground" : "text-muted")}>
                        5. Configurar nuevo broker
                      </p>
                    </div>
                  </li>
                )}
              </ul>

              {/* Final outcome banner */}
              {isDone && (
                <div className={cn(
                  "mt-6 p-4 rounded-md border",
                  state.phase === 'done' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700" : "bg-amber-500/10 border-amber-500/20 text-amber-700"
                )}>
                  <div className="flex gap-3">
                    {state.phase === 'done' ? (
                      <CheckCircle2 className="size-5 shrink-0" />
                    ) : (
                      <AlertTriangle className="size-5 shrink-0" />
                    )}
                    <div className="text-sm">
                      <p className="font-medium">
                        {state.phase === 'done' ? "Migración exitosa" : "Resultado incierto"}
                      </p>
                      {state.phase === 'uncertain' && (
                        <p className="mt-1 opacity-90">
                          {state.errorMessage || "No se pudo confirmar si la migración se realizó. Intente verificar el broker nuevamente o revise la impresora físicamente."}
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
