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
  | 'checking-broker'
  | 'broker-checked'
  | 'configuring-broker'
  | 'done'
  | 'uncertain'
  | 'error';

export interface MigrationState {
  phase: MigrationPhase;
  firmwareVersion?: string;
  needsFirmwareUpdate?: boolean;
  currentBrokerHost?: string;
  isOldBroker?: boolean;
  configOutcome?: BrokerMigrationOutcome;
  errorMessage?: string;
  rebootCountdown?: number;
}

export function useBrokerMigration(printerId: number, rebootWaitSeconds: number) {
  const [state, setState] = useState<MigrationState>({ phase: 'idle' });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const updateState = (partial: Partial<MigrationState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  };

  const checkFirmware = useCallback(async () => {
    updateState({ phase: 'checking-firmware', errorMessage: undefined });
    try {
      const res = await checkFirmwareVersion(printerId);
      updateState({
        phase: 'firmware-checked',
        firmwareVersion: res.firmwareVersion,
        needsFirmwareUpdate: res.needsUpdate,
      });
    } catch (err) {
      updateState({ phase: 'error', errorMessage: getToolsMqttErrorMessage(err) });
    }
  }, [printerId]);

  const updateFirmware = useCallback(async () => {
    updateState({ phase: 'updating-firmware', errorMessage: undefined });
    try {
      await triggerFirmwareUpdate(printerId);
      
      // Enter waiting-reboot phase
      updateState({ phase: 'waiting-reboot', rebootCountdown: rebootWaitSeconds });
      
      let timeLeft = rebootWaitSeconds;
      timerRef.current = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          checkBroker();
        } else {
          updateState({ rebootCountdown: timeLeft });
        }
      }, 1000);
      
    } catch (err) {
      updateState({ phase: 'error', errorMessage: getToolsMqttErrorMessage(err) });
    }
  }, [printerId, rebootWaitSeconds]);

  const checkBroker = useCallback(async () => {
    updateState({ phase: 'checking-broker', errorMessage: undefined, rebootCountdown: undefined });
    try {
      const res = await checkCurrentBroker(printerId);
      updateState({
        phase: 'broker-checked',
        currentBrokerHost: res.currentBrokerHost,
        isOldBroker: res.isOldBroker,
      });
    } catch (err) {
      updateState({ phase: 'error', errorMessage: getToolsMqttErrorMessage(err) });
    }
  }, [printerId]);

  const configBroker = useCallback(async () => {
    updateState({ phase: 'configuring-broker', errorMessage: undefined });
    try {
      const res = await configureBroker(printerId);
      if (res.outcome === 'MIGRATED') {
        updateState({ phase: 'done', configOutcome: res.outcome });
      } else if (res.outcome === 'UNCERTAIN') {
        updateState({ phase: 'uncertain', configOutcome: res.outcome, errorMessage: res.message });
      } else {
        updateState({ phase: 'error', configOutcome: res.outcome, errorMessage: res.message || "La migración fue rechazada." });
      }
    } catch (err) {
      updateState({ phase: 'error', errorMessage: getToolsMqttErrorMessage(err) });
    }
  }, [printerId]);

  const startMigration = useCallback(() => {
    checkFirmware();
  }, [checkFirmware]);

  const confirmContinue = useCallback(() => {
    if (state.phase === 'firmware-checked') {
      if (state.needsFirmwareUpdate) {
        updateFirmware();
      } else {
        checkBroker();
      }
    } else if (state.phase === 'broker-checked') {
      configBroker();
    }
  }, [state.phase, state.needsFirmwareUpdate, updateFirmware, checkBroker, configBroker]);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setState({ phase: 'idle' });
  }, []);

  return {
    state,
    startMigration,
    confirmContinue,
    reset,
  };
}
