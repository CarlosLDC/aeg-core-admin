"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/context/toast-provider";
import { fetchPrinterById, fetchPrinters } from "@/lib/printers-api";
import { fetchBranchById } from "@/lib/branches-api";
import { fetchClientById, fetchClients } from "@/lib/clients-api";
import { fetchCompanyById } from "@/lib/companies-api";
import { getMqttErrorMessage, precheckEnajenacionMqtt, getEnajenacionActiveSessions, getEnajenacionActivity } from "@/lib/mqtt-api";
import { useEnajenacionSse } from "@/hooks/use-enajenacion-sse";
import {
  ENAJENACION_FLOW_STEPS,
  buildEnajenacionCommandContextFromClientData,
  buildPrinterSimulationPayload,
  compactMac,
  type EnajenacionCommandContext,
  fiscalCmdServerTopic,
  fiscalComandoTopic,
  fiscalMonitorTopic,
  fiscalRespuestaTopic,
  isPrinterEligibleForEnajenacionTest,
  type PrinterSimulationPayload,
} from "@/lib/enajenacion-mqtt-protocol";
import type { PrinterResponse } from "@/types/printer";
import type { ClientResponse } from "@/types/branch-role";
import type { MqttInboundMessage } from "@/types/mqtt";
import type { EnajenacionActiveSession } from "@/types/mqtt";
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
  isChecklist?: boolean;
};

export type RitualTopics = {
  mac: string;
  cmdServer: string;
  respuesta: string;
  comando: string;
  monitor: string;
};

export type RitualStepActionState = {
  status: RitualStepStatus;
  locked: boolean;
  isActive: boolean;
  isReview: boolean;
  serverCommand: MqttInboundMessage | null;
  acceptedPrinterResponse: MqttInboundMessage | null;
  simulation: PrinterSimulationPayload | null;
  simulateDisabled: boolean;
  simulateDisabledReason?: string;
  contextLine: string;
  waitingElapsedSeconds: number | null;
  waitingTimeoutSeconds: number | null;
  serverCommandSimulation?: PrinterSimulationPayload | null;
  publishDisabled?: boolean;
  publishDisabledReason?: string;
};

export function useEnajenacionRitual() {
  const toast = useToast();
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [clients, setClients] = useState<ClientResponse[]>([]);
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
  const [persistentSessionError, setPersistentSessionError] = useState<string | null>(
    null,
  );
  const [activeBackendSession, setActiveBackendSession] =
    useState<EnajenacionActiveSession | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const hadActiveBackendSessionRef = useRef(false);

  const SESSION_POLL_MS = 8_000;

  const eligiblePrinters = useMemo(
    () => printers.filter(isPrinterEligibleForEnajenacionTest),
    [printers],
  );

  const clientNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const client of clients) {
      const name = client.companyBusinessName?.trim();
      if (name) map.set(client.id, name);
    }
    return map;
  }, [clients]);

  const getClientName = useCallback(
    (clientId: number | null | undefined): string => {
      if (clientId == null) return "—";
      return clientNameById.get(clientId) ?? "Cliente desconocido";
    },
    [clientNameById],
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
      respuesta: fiscalRespuestaTopic(mac),
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

  const completedRitualSteps = useMemo(() => {
    if (!topics) return new Set<string>();
    const done = new Set<string>();
    for (const stepId of sse.acceptedStepIds) {
      done.add(stepId);
    }
    if (panelAcknowledgedSteps.has("request")) {
      done.add("request");
    }
    return done;
  }, [panelAcknowledgedSteps, sse.acceptedStepIds, topics]);

  const sessionStartedAt = useMemo(() => {
    for (let index = sse.eventLog.length - 1; index >= 0; index -= 1) {
      const event = sse.eventLog[index];
      if (event.type === "session_started") {
        return event.at;
      }
    }
    return null;
  }, [sse.eventLog]);

  const activeStepIndex = useMemo(() => {
    const index = ritualSteps.findIndex(
      (step) => stepStatuses[step.id] !== "success",
    );
    return index === -1 ? ritualSteps.length : index;
  }, [ritualSteps, stepStatuses]);

  const ritualComplete = activeStepIndex >= ritualSteps.length;

  const ritualInProgress = Boolean(
    topics &&
      !ritualComplete &&
      (sessionStartedAt !== null || panelAcknowledgedSteps.has("request")),
  );

  useEffect(() => {
    if (!activeBackendSession?.awaitingResponse) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, [activeBackendSession?.awaitingResponse]);

  useEffect(() => {
    if (!ritualInProgress || !topics?.mac) {
      setActiveBackendSession(null);
      return;
    }
    let cancelled = false;

    async function pollSessions() {
      try {
        const sessions = await getEnajenacionActiveSessions();
        if (cancelled) return;
        const macUpper = topics!.mac.toUpperCase();
        const match =
          sessions.find((s) => s.mac.toUpperCase() === macUpper) ?? null;
        if (match) {
          hadActiveBackendSessionRef.current = true;
          setActiveBackendSession(match);
          return;
        }
        setActiveBackendSession(null);
        if (
          hadActiveBackendSessionRef.current ||
          sse.acceptedStepIds.has("dnf")
        ) {
          const activity = await getEnajenacionActivity({
            mac: topics!.mac,
            limit: 30,
          });
          if (cancelled) return;
          const failed = activity.entries.find((e) => e.result === "FAILED");
          if (failed) {
            setPersistentSessionError(
              failed.detail?.trim() ||
                "La sesión de enajenación falló en el servidor.",
            );
          }
        }
      } catch {
        // Polling es best-effort; no bloquear el ritual por errores transitorios.
      }
    }

    void pollSessions();
    const id = window.setInterval(() => void pollSessions(), SESSION_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [ritualInProgress, topics, sse.acceptedStepIds]);

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
            encFacFijoLines: activePrinter?.header?.lines,
            pieFacFijoLines: activePrinter?.trailer?.lines,
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
  }, [activePrinter?.clientId, activePrinter?.fiscalSerial, activePrinter?.header, activePrinter?.trailer]);

  useEffect(() => {
    if (completedRitualSteps.size === 0) {
      setStepStatuses({});
      return;
    }
    const next: Record<string, RitualStepStatus> = {};
    for (const step of ritualSteps) {
      next[step.id] = completedRitualSteps.has(step.id) ? "success" : "pending";
    }
    setStepStatuses(next);
  }, [completedRitualSteps, ritualSteps]);

  const refreshPrinterStatus = useCallback(async (printerId: number) => {
    const updated = await fetchPrinterById(printerId);
    setPrinterStatus(updated);
    return updated;
  }, []);

  useEffect(() => {
    if (sse.sessionError) {
      setPersistentSessionError(sse.sessionError);
      toast.error(sse.sessionError);
    }
  }, [sse.sessionError, toast]);

  useEffect(() => {
    if (sse.lastEvent?.type === "session_started") {
      setPersistentSessionError(null);
      hadActiveBackendSessionRef.current = false;
      setActiveBackendSession(null);
    }
  }, [sse.lastEvent]);

  useEffect(() => {
    if (sse.lastEvent?.type === "session_completed" && activePrinter) {
      void refreshPrinterStatus(activePrinter.id).catch(() => undefined);
    }
  }, [activePrinter, refreshPrinterStatus, sse.lastEvent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, clientList] = await Promise.all([
          fetchPrinters(),
          fetchClients(),
        ]);
        if (!cancelled) {
          setPrinters(list);
          setClients(clientList);
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
      const serverCommand =
        step.isRequest || !sseCommand
          ? null
          : sseCommandToInbound(sseCommand);
      const ssePrinterResponse = sse.acceptedPrinterResponsesByStepId[step.id];
      const acceptedPrinterResponse =
        step.isRequest || !ssePrinterResponse
          ? null
          : sseCommandToInbound(ssePrinterResponse);
      const simulation =
        commandContext && activePrinter?.macAddress
          ? buildPrinterSimulationPayload(
              step.id,
              commandContext,
              activePrinter.macAddress,
              {
                cmdServer: topics.cmdServer,
                respuesta: topics.respuesta,
              },
            )
          : null;
      const canSimulatePrinterResponse =
        step.isRequest || Boolean(serverCommand);
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
                  : "Espera la conexión SSE o el comando del servidor."
                : undefined;

      const contextLine = step.isRequest
        ? "Publica ptrEnajenar en CmdServer para iniciar el ritual."
        : "AEG Core publica en Comando → simula la respuesta de impresora en Respuesta.";

      const waitingElapsedSeconds =
        isActive &&
        activeBackendSession?.awaitingResponse &&
        activeBackendSession.awaitingSince
          ? Math.max(
              0,
              Math.floor(
                (nowMs - Date.parse(activeBackendSession.awaitingSince)) / 1000,
              ),
            )
          : null;
      const waitingTimeoutSeconds =
        isActive && activeBackendSession?.awaitingResponse
          ? (activeBackendSession.timeoutSeconds ?? null)
          : null;

      return {
        status,
        locked,
        isActive,
        isReview,
        serverCommand,
        acceptedPrinterResponse,
        simulation,
        simulateDisabled,
        simulateDisabledReason,
        contextLine,
        waitingElapsedSeconds,
        waitingTimeoutSeconds,
      };
    },
    [
      activePrinter?.macAddress,
      activeStepIndex,
      commandContext,
      commandContextError,
      commandContextLoading,
      precheck,
      ritualSteps,
      stepStatuses,
      topics,
      sse.serverCommandsByStepId,
      sse.acceptedPrinterResponsesByStepId,
      sse.status,
      activeBackendSession,
      nowMs,
    ],
  );

  function handlePrinterChange(value: string) {
    setSelectedId(value ? Number(value) : "");
    setStepStatuses({});
    setPrinterStatus(null);
    setCommandContext(null);
    setCommandContextError(null);
    setPanelAcknowledgedSteps(new Set());
    setDisplayStepIndex(0);
    setPersistentSessionError(null);
    setActiveBackendSession(null);
    hadActiveBackendSessionRef.current = false;
  }

  function handleStepPublished(stepId: string) {
    if (stepId !== "request") {
      return;
    }
    setPanelAcknowledgedSteps((prev) => new Set([...prev, stepId]));
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
    getClientName,
    printerStatus,
    selectedId,
    topics,
    ritualSteps,
    sessionStartedAt,
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
    handleStepperSelect,
    refreshPrinterStatus,
    sseStatus: sse.status,
    persistentSessionError,
    activeBackendSession,
  };
}
