import { useState, useCallback, useRef, useEffect } from "react";
import {
  checkFirmwareVersion,
  triggerFirmwareUpdate,
  checkCurrentBroker,
  configureBroker,
  type BrokerMigrationOutcome,
} from "@/lib/broker-migration-api";
import { getToolsMqttErrorMessage } from "@/lib/tools-mqtt-api";

export type MigrationPhase =
  | 'idle'
  | 'checking-firmware'
  | 'firmware-checked'
  | 'updating-firmware'
  | 'waiting-reboot'
  | 'verifying-firmware'
  | 'checking-broker'
  | 'broker-checked'
  | 'configuring-broker'
  | 'done'
  | 'already-migrated'
  | 'uncertain'
  | 'error';

export interface MigrationState {
  phase: MigrationPhase;
  /** Fase en curso cuando ocurrió el error (solo si phase === 'error'). */
  failedPhase?: MigrationPhase;
  firmwareVersion?: string;
  needsFirmwareUpdate?: boolean;
  /** true si en esta sesión se envió updFirmDown. */
  firmwareUpdated?: boolean;
  currentBrokerHost?: string;
  isOldBroker?: boolean;
  configOutcome?: BrokerMigrationOutcome;
  infoMessage?: string;
  errorMessage?: string;
  rebootCountdown?: number;
}

export function useBrokerMigration(printerId: number, rebootWaitSeconds: number) {
  const [state, setState] = useState<MigrationState>({ phase: 'idle' });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Se incrementa en reset/unmount para descartar respuestas de operaciones ya abandonadas.
  const runIdRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      clearTimer();
    };
  }, []);

  const updateState = (partial: Partial<MigrationState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  /** Ejecuta un paso; si falla, pasa a 'error' recordando qué fase falló. */
  const runStep = useCallback(
    async (phase: MigrationPhase, action: () => Promise<void>) => {
      const runId = runIdRef.current;
      updateState({ phase, failedPhase: undefined, errorMessage: undefined });
      try {
        await action();
      } catch (err) {
        if (runId !== runIdRef.current) return;
        updateState({ phase: 'error', failedPhase: phase, errorMessage: getToolsMqttErrorMessage(err) });
      }
    },
    [],
  );

  const isCurrent = (runId: number) => runId === runIdRef.current;

  const checkBroker = useCallback(async () => {
    const runId = runIdRef.current;
    await runStep('checking-broker', async () => {
      const res = await checkCurrentBroker(printerId);
      if (!isCurrent(runId)) return;
      updateState({
        phase: res.isOldBroker ? 'broker-checked' : 'already-migrated',
        currentBrokerHost: res.currentBrokerHost,
        isOldBroker: res.isOldBroker,
        rebootCountdown: undefined,
      });
    });
  }, [printerId, runStep]);

  const checkFirmware = useCallback(async () => {
    const runId = runIdRef.current;
    await runStep('checking-firmware', async () => {
      const res = await checkFirmwareVersion(printerId);
      if (!isCurrent(runId)) return;
      updateState({
        phase: 'firmware-checked',
        firmwareVersion: res.firmwareVersion,
        needsFirmwareUpdate: res.needsUpdate,
      });
    });
  }, [printerId, runStep]);

  /** Tras el reinicio confirma que el firmware ya no es el legacy antes de seguir con el broker. */
  const verifyFirmwareAfterReboot = useCallback(async () => {
    const runId = runIdRef.current;
    let verified = false;
    await runStep('verifying-firmware', async () => {
      const res = await checkFirmwareVersion(printerId);
      if (!isCurrent(runId)) return;
      updateState({ firmwareVersion: res.firmwareVersion, needsFirmwareUpdate: res.needsUpdate });
      if (res.needsUpdate) {
        throw new Error(
          `El firmware sigue en ${res.firmwareVersion}; la actualización no se aplicó. Reintente la actualización.`,
        );
      }
      verified = true;
    });
    if (verified && isCurrent(runId)) {
      await checkBroker();
    }
  }, [printerId, runStep, checkBroker]);

  const updateFirmware = useCallback(async () => {
    const runId = runIdRef.current;
    let started = false;
    await runStep('updating-firmware', async () => {
      const res = await triggerFirmwareUpdate(printerId);
      if (!res.success) {
        throw new Error(res.message || "La impresora rechazó la actualización de firmware.");
      }
      if (!isCurrent(runId)) return;
      started = true;
      updateState({
        phase: 'waiting-reboot',
        firmwareUpdated: true,
        infoMessage: res.message,
        rebootCountdown: rebootWaitSeconds,
      });
    });
    if (!started || !isCurrent(runId)) return;

    let timeLeft = rebootWaitSeconds;
    clearTimer();
    timerRef.current = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        clearTimer();
        if (isCurrent(runId)) void verifyFirmwareAfterReboot();
      } else {
        updateState({ rebootCountdown: timeLeft });
      }
    }, 1000);
  }, [printerId, rebootWaitSeconds, runStep, verifyFirmwareAfterReboot]);

  const configBroker = useCallback(async () => {
    const runId = runIdRef.current;
    await runStep('configuring-broker', async () => {
      const res = await configureBroker(printerId);
      if (!isCurrent(runId)) return;
      if (res.outcome === 'MIGRATED') {
        updateState({ phase: 'done', configOutcome: res.outcome, infoMessage: res.message });
      } else if (res.outcome === 'UNCERTAIN') {
        updateState({ phase: 'uncertain', configOutcome: res.outcome, errorMessage: res.message });
      } else {
        updateState({ configOutcome: res.outcome });
        throw new Error(res.message || "La migración fue rechazada.");
      }
    });
  }, [printerId, runStep]);

  const startMigration = useCallback(() => {
    clearTimer();
    runIdRef.current += 1;
    setState({ phase: 'idle' });
    void checkFirmware();
  }, [checkFirmware]);

  const confirmContinue = useCallback(() => {
    if (state.phase === 'firmware-checked') {
      if (state.needsFirmwareUpdate) {
        void updateFirmware();
      } else {
        void checkBroker();
      }
    } else if (state.phase === 'broker-checked' && state.isOldBroker) {
      void configBroker();
    }
  }, [state.phase, state.needsFirmwareUpdate, state.isOldBroker, updateFirmware, checkBroker, configBroker]);

  /** Re-verifica a qué broker está conectada (útil tras un resultado incierto). */
  const recheckBroker = useCallback(() => {
    void checkBroker();
  }, [checkBroker]);

  const reset = useCallback(() => {
    clearTimer();
    runIdRef.current += 1;
    setState({ phase: 'idle' });
  }, []);

  return {
    state,
    startMigration,
    confirmContinue,
    recheckBroker,
    reset,
  };
}
