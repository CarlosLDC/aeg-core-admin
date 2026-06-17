"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/toast-provider";
import { fetchPrinterById, fetchPrinters } from "@/lib/printers-api";
import { fetchBranchById } from "@/lib/branches-api";
import { fetchClientById } from "@/lib/clients-api";
import { fetchCompanyById } from "@/lib/companies-api";
import { getMqttErrorMessage, precheckEnajenacionMqtt } from "@/lib/mqtt-api";
import { useEnajenacionSse } from "@/hooks/use-enajenacion-sse";
import {
  ENAJENACION_FLOW_STEPS,
  buildEnajenacionCommandContextFromClientData,
  buildPrinterSimulationPayload,
  compactMac,
  type EnajenacionCommandContext,
  detectPrinterResponseStep,
  detectServerCommandStep,
  filterFiscalMessagesSince,
  findLatestPtrEnajenarReceivedAt,
  findLatestServerCommand,
  fiscalCmdServerTopic,
  fiscalComandoTopic,
  fiscalMonitorTopic,
  isFiscalCmdServerTopic,
  isPrinterEligibleForEnajenacionTest,
  parseMessageReceivedAt,
  resolveWfileResponseStep,
  type PrinterSimulationPayload,
} from "@/lib/enajenacion-mqtt-protocol";
import type { PrinterResponse } from "@/types/printer";
import type { MqttInboundMessage } from "@/types/mqtt";
import type { EnajenacionSseServerCommand } from "@/types/enajenacion-sse";

function sseCommandToInbound(
  command: EnajenacionSseServerCommand,
): MqttInboundMessage {
  return {
    topic: command.topic,
    payload: command.payload,
    receivedAt: command.receivedAt,
    qos: null,
  };
}

export type RitualStepStatus = "pending" | "success";

export type RitualStep = {
  id: string;
  step: string;
  name: string;
  isRequest: boolean;
};

export type RitualTopics = {
  mac: string;
  cmdServer: string;
  comando: string;
  monitor: string;
};

export type RitualStepActionState = {
  status: RitualStepStatus;
  locked: boolean;
  isActive: boolean;
  isReview: boolean;
  serverCommand: MqttInboundMessage | null;
  simulation: PrinterSimulationPayload | null;
  simulateDisabled: boolean;
  simulateDisabledReason?: string;
  contextLine: string;
};

export function useEnajenacionRitual(liveMessages: MqttInboundMessage[]) {
  const toast = useToast();
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [printersLoading, setPrintersLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [printerStatus, setPrinterStatus] = useState<PrinterResponse | null>(
    null,
  );
  const [stepStatuses, setStepStatuses] = useState<
    Record<string, RitualStepStatus>
  >({});
  const [precheck, setPrecheck] = useState<{
    ready: boolean;
    message: string | null;
  } | null>(null);
  const [precheckLoading, setPrecheckLoading] = useState(false);
  const [manualTrackingAnchorAt, setManualTrackingAnchorAt] = useState<
    number | null
  >(null);
  const [commandContext, setCommandContext] =
    useState<EnajenacionCommandContext | null>(null);
  const [commandContextLoading, setCommandContextLoading] = useState(false);
  const [commandContextError, setCommandContextError] = useState<string | null>(
    null,
  );
  const [panelAcknowledgedSteps, setPanelAcknowledgedSteps] = useState<
    Set<string>
  >(() => new Set());
  const [displayStepIndex, setDisplayStepIndex] = useState(0);

  const eligiblePrinters = useMemo(
    () => printers.filter(isPrinterEligibleForEnajenacionTest),
    [printers],
  );

  const activePrinter = useMemo(
    () => eligiblePrinters.find((p) => p.id === selectedId) ?? null,
    [eligiblePrinters, selectedId],
  );

  const topics = useMemo((): RitualTopics | null => {
    if (!activePrinter?.macAddress) return null;
    const mac = compactMac(activePrinter.macAddress);
    return {
      mac,
      cmdServer: fiscalCmdServerTopic(mac),
      comando: fiscalComandoTopic(mac),
      monitor: fiscalMonitorTopic(mac),
    };
  }, [activePrinter]);

  const sse = useEnajenacionSse(topics?.mac ?? null, Boolean(topics));

  const ritualSteps = useMemo<RitualStep[]>(() => {
    if (!topics) return [];
    return ENAJENACION_FLOW_STEPS.map((flow) => ({
      id: flow.id,
      step: flow.step,
      name: flow.name,
      isRequest: flow.id === "request",
    }));
  }, [topics]);

  const autoPtrEnajenarAnchorAt = useMemo(() => {
    if (!topics) return null;
    return findLatestPtrEnajenarReceivedAt(liveMessages, topics.mac);
  }, [liveMessages, topics]);

  const ritualAnchorAt = useMemo(() => {
    if (manualTrackingAnchorAt !== null) {
      if (
        autoPtrEnajenarAnchorAt !== null &&
        autoPtrEnajenarAnchorAt > manualTrackingAnchorAt
      ) {
        return autoPtrEnajenarAnchorAt;
      }
      return manualTrackingAnchorAt;
    }
    return autoPtrEnajenarAnchorAt;
  }, [autoPtrEnajenarAnchorAt, manualTrackingAnchorAt]);

  const ritualMessages = useMemo(() => {
    if (!topics || ritualAnchorAt === null) return [];
    return filterFiscalMessagesSince(liveMessages, topics.mac, ritualAnchorAt);
  }, [liveMessages, topics, ritualAnchorAt]);

  const completedRitualSteps = useMemo(() => {
    if (!topics) return new Set<string>();
    const done = new Set<string>();
    if (ritualAnchorAt !== null) {
      let wfileResponseIndex = 0;
      const chronological = [...ritualMessages].sort(
        (a, b) =>
          (parseMessageReceivedAt(a.receivedAt) ?? 0) -
          (parseMessageReceivedAt(b.receivedAt) ?? 0),
      );
      for (const message of chronological) {
        const serverStep = detectServerCommandStep(
          message.topic,
          message.payload,
        );
        if (serverStep === "dnf") {
          done.add("request");
        }

        if (!isFiscalCmdServerTopic(message.topic)) continue;
        const step = detectPrinterResponseStep(message.payload);
        if (!step) continue;
        if (step === "request") {
          done.add("request");
          continue;
        }
        if (step === "wfile_spiff") {
          const resolved = resolveWfileResponseStep(wfileResponseIndex);
          if (resolved) done.add(resolved);
          wfileResponseIndex++;
          continue;
        }
        done.add(step);
      }
    }
    for (const stepId of panelAcknowledgedSteps) {
      done.add(stepId);
    }
    for (const stepId of sse.acceptedStepIds) {
      done.add(stepId);
    }
    return done;
  }, [panelAcknowledgedSteps, ritualAnchorAt, ritualMessages, sse.acceptedStepIds, topics]);

  const activeStepIndex = useMemo(() => {
    const index = ritualSteps.findIndex(
      (step) => stepStatuses[step.id] !== "success",
    );
    return index === -1 ? ritualSteps.length : index;
  }, [ritualSteps, stepStatuses]);

  const ritualComplete = activeStepIndex >= ritualSteps.length;

  useEffect(() => {
    if (ritualComplete) return;
    setDisplayStepIndex(activeStepIndex);
  }, [activeStepIndex, ritualComplete]);

  useEffect(() => {
    if (!activePrinter?.fiscalSerial?.trim() || !activePrinter.macAddress?.trim()) {
      setPrecheck(null);
      return;
    }
    let cancelled = false;
    setPrecheckLoading(true);
    void precheckEnajenacionMqtt(
      activePrinter.fiscalSerial,
      activePrinter.macAddress,
    )
      .then((result) => {
        if (!cancelled) setPrecheck(result);
      })
      .catch(() => {
        if (!cancelled) setPrecheck(null);
      })
      .finally(() => {
        if (!cancelled) setPrecheckLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activePrinter?.fiscalSerial, activePrinter?.macAddress]);

  useEffect(() => {
    const clientId = activePrinter?.clientId;
    const fiscalSerial = activePrinter?.fiscalSerial?.trim();
    if (!clientId || !fiscalSerial) {
      setCommandContext(null);
      setCommandContextError(null);
      return;
    }
    let cancelled = false;
    setCommandContextLoading(true);
    setCommandContextError(null);
    void (async () => {
      try {
        const client = await fetchClientById(clientId);
        const branch = await fetchBranchById(client.branchId);
        const company = await fetchCompanyById(branch.companyId);
        if (cancelled) return;
        setCommandContext(
          buildEnajenacionCommandContextFromClientData({
            fiscalSerial,
            rif: company.rif,
            businessName: company.businessName,
            contributorType: company.contributorType,
            address: branch.address,
            city: branch.city,
            state: branch.state,
          }),
        );
      } catch (err) {
        if (!cancelled) {
          setCommandContext(null);
          setCommandContextError(getMqttErrorMessage(err));
        }
      } finally {
        if (!cancelled) setCommandContextLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePrinter?.clientId, activePrinter?.fiscalSerial]);

  useEffect(() => {
    if (ritualAnchorAt === null && completedRitualSteps.size === 0) {
      setStepStatuses({});
      return;
    }
    const next: Record<string, RitualStepStatus> = {};
    for (const step of ritualSteps) {
      next[step.id] = completedRitualSteps.has(step.id) ? "success" : "pending";
    }
    setStepStatuses(next);
  }, [completedRitualSteps, ritualAnchorAt, ritualSteps]);

  const refreshPrinterStatus = useCallback(async (printerId: number) => {
    const updated = await fetchPrinterById(printerId);
    setPrinterStatus(updated);
    return updated;
  }, []);

  useEffect(() => {
    if (sse.sessionError) {
      toast.error(sse.sessionError);
    }
  }, [sse.sessionError, toast]);

  useEffect(() => {
    if (sse.lastEvent?.type === "session_completed" && activePrinter) {
      void refreshPrinterStatus(activePrinter.id).catch(() => undefined);
    }
  }, [activePrinter, refreshPrinterStatus, sse.lastEvent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchPrinters();
        if (!cancelled) {
          setPrinters(list);
          const first = list.find(isPrinterEligibleForEnajenacionTest);
          if (first) setSelectedId(first.id);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(getMqttErrorMessage(err));
        }
      } finally {
        if (!cancelled) setPrintersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (!activePrinter) {
      setPrinterStatus(null);
      return;
    }
    let cancelled = false;
    void refreshPrinterStatus(activePrinter.id)
      .then((updated) => {
        if (!cancelled) setPrinterStatus(updated);
      })
      .catch(() => {
        if (!cancelled) setPrinterStatus(activePrinter);
      });
    return () => {
      cancelled = true;
    };
  }, [activePrinter, refreshPrinterStatus]);

  const getStepActionState = useCallback(
    (index: number): RitualStepActionState | null => {
      const step = ritualSteps[index];
      if (!step || !topics) return null;

      const status = stepStatuses[step.id] ?? "pending";
      const locked = index > activeStepIndex;
      const isActive = index === activeStepIndex;
      const isReview = status === "success" && index < activeStepIndex;
      const sseCommand = sse.serverCommandsByStepId[step.id];
      const serverCommand = step.isRequest
        ? null
        : sseCommand
          ? sseCommandToInbound(sseCommand)
          : findLatestServerCommand(ritualMessages, topics.mac, step.id);
      const simulation =
        commandContext && activePrinter?.macAddress
          ? buildPrinterSimulationPayload(
              step.id,
              commandContext,
              activePrinter.macAddress,
              topics.cmdServer,
            )
          : null;
      const priorStepsComplete = ritualSteps
        .slice(0, index)
        .every((s) => (stepStatuses[s.id] ?? "pending") === "success");
      const canSimulatePrinterResponse =
        step.isRequest ||
        Boolean(serverCommand) ||
        (isActive && priorStepsComplete);
      const simulateDisabled =
        locked ||
        !simulation ||
        commandContextLoading ||
        Boolean(precheck && !precheck.ready) ||
        (status === "pending" && !canSimulatePrinterResponse);
      const simulateDisabledReason = locked
        ? "Completa el paso anterior primero."
        : commandContextLoading
          ? "Cargando datos fiscales del cliente…"
          : commandContextError
            ? commandContextError
            : precheck && !precheck.ready
              ? (precheck.message ?? "AEG Core rechazará ptrEnajenar.")
              : status === "pending" && !canSimulatePrinterResponse
                ? sse.status === "open" || sse.status === "connecting"
                  ? "Esperando confirmación del servidor (SSE)…"
                  : "Espera el comando real de AEG Core en Comando."
                : undefined;

      const contextLine = step.isRequest
        ? "Publica ptrEnajenar en CmdServer para iniciar el ritual."
        : "AEG Core publica en Comando → simula la respuesta de impresora en CmdServer.";

      return {
        status,
        locked,
        isActive,
        isReview,
        serverCommand,
        simulation,
        simulateDisabled,
        simulateDisabledReason,
        contextLine,
      };
    },
    [
      activePrinter?.macAddress,
      activeStepIndex,
      commandContext,
      commandContextError,
      commandContextLoading,
      precheck,
      ritualMessages,
      ritualSteps,
      stepStatuses,
      topics,
      sse.serverCommandsByStepId,
      sse.status,
    ],
  );

  function handlePrinterChange(value: string) {
    setSelectedId(value ? Number(value) : "");
    setStepStatuses({});
    setPrinterStatus(null);
    setManualTrackingAnchorAt(null);
    setCommandContext(null);
    setCommandContextError(null);
    setPanelAcknowledgedSteps(new Set());
    setDisplayStepIndex(0);
  }

  function handleStepPublished(stepId: string) {
    setPanelAcknowledgedSteps((prev) => new Set([...prev, stepId]));
    if (stepId === "request") {
      setManualTrackingAnchorAt((prev) => prev ?? Date.now());
    }
  }

  function handleResetTracking() {
    setManualTrackingAnchorAt(Date.now());
    setStepStatuses({});
    setPanelAcknowledgedSteps(new Set());
    setDisplayStepIndex(0);
    toast.success("Seguimiento reiniciado.");
  }

  function handleStepperSelect(index: number) {
    const step = ritualSteps[index];
    if (!step) return;
    if (index === activeStepIndex) {
      setDisplayStepIndex(index);
      return;
    }
    if (
      index < activeStepIndex &&
      (stepStatuses[step.id] ?? "pending") === "success"
    ) {
      setDisplayStepIndex(index);
    }
  }

  const displayedStep = ritualSteps[displayStepIndex] ?? null;
  const displayedStepState = getStepActionState(displayStepIndex);

  return {
    printersLoading,
    eligiblePrinters,
    activePrinter,
    printerStatus,
    selectedId,
    topics,
    ritualSteps,
    ritualAnchorAt,
    stepStatuses,
    activeStepIndex,
    displayStepIndex,
    displayedStep,
    displayedStepState,
    ritualComplete,
    precheck,
    precheckLoading,
    commandContextLoading,
    commandContextError,
    handlePrinterChange,
    handleStepPublished,
    handleResetTracking,
    handleStepperSelect,
    refreshPrinterStatus,
    sseStatus: sse.status,
  };
}
