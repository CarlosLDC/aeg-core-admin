"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/toast-provider";
import { fetchPrinterById, fetchPrinters } from "@/lib/printers-api";
import { fetchBranchById } from "@/lib/branches-api";
import { fetchClientById, fetchClients } from "@/lib/clients-api";
import { fetchCompanyById } from "@/lib/companies-api";
import { getMqttErrorMessage } from "@/lib/mqtt-api";
import {
  buildEnajenacionCommandContextFromClientData,
  compactMac,
  type EnajenacionCommandContext,
  fiscalComandoTopic,
  fiscalCmdServerTopic,
  fiscalMonitorTopic,
  fiscalRespuestaTopic,
  isPrinterEligibleForTestInvoice,
} from "@/lib/enajenacion-mqtt-protocol";
import {
  ANNUAL_INSPECTION_RITUAL_STEPS,
  buildAnnualInspectionPrinterSimulationPayload,
  buildAnnualInspectionServerCommandSimulation,
  parseStaInfRegistroFromResponse,
  parseTestInvoiceNumberFromResponse,
  type AnnualInspectionRitualStepId,
  type AnnualInspectionSimulatorContext,
} from "@/lib/annual-inspection-mqtt-simulator";
import {
  ANNUAL_INSPECTION_DEFAULT_PRODUCT,
  applyProductDescriptionChange,
  applySuccessfulTestCreditNote,
  applySuccessfulTestInvoice,
  emptyAnnualInspectionChecklist,
  type AnnualInspectionChecklistKey,
  type AnnualInspectionChecklistState,
} from "@/lib/annual-inspection-mqtt-state";
import type {
  RitualStep,
  RitualStepActionState,
  RitualStepStatus,
  RitualTopics,
} from "@/hooks/use-enajenacion-ritual";
import type { PrinterResponse } from "@/types/printer";
import type { ClientResponse } from "@/types/branch-role";
import type { MqttInboundMessage } from "@/types/mqtt";
import { formatMqttPayloadForDisplay } from "@/lib/enajenacion-mqtt-protocol";

function nowIso(): string {
  return new Date().toISOString();
}

function payloadToInbound(topic: string, payload: unknown): MqttInboundMessage {
  return {
    topic,
    payload: formatMqttPayloadForDisplay(JSON.stringify(payload)),
    receivedAt: nowIso(),
    qos: null,
  };
}

export function useAnnualInspectionRitual() {
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
  const [commandContext, setCommandContext] =
    useState<EnajenacionCommandContext | null>(null);
  const [commandContextLoading, setCommandContextLoading] = useState(false);
  const [commandContextError, setCommandContextError] = useState<string | null>(
    null,
  );
  const [displayStepIndex, setDisplayStepIndex] = useState(0);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [serverCommandsByStepId, setServerCommandsByStepId] = useState<
    Record<string, MqttInboundMessage>
  >({});
  const [acceptedPrinterResponsesByStepId, setAcceptedPrinterResponsesByStepId] =
    useState<Record<string, MqttInboundMessage>>({});
  const [registroImpresora, setRegistroImpresora] = useState("");
  const [numeroFacturaPrueba, setNumeroFacturaPrueba] = useState<number | null>(
    null,
  );
  const [productDescription, setProductDescription] = useState(
    ANNUAL_INSPECTION_DEFAULT_PRODUCT,
  );
  const [checklist, setChecklist] = useState<AnnualInspectionChecklistState>(
    () => emptyAnnualInspectionChecklist(),
  );

  const eligiblePrinters = useMemo(
    () => printers.filter(isPrinterEligibleForTestInvoice),
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

  const ritualSteps = useMemo<RitualStep[]>(() => {
    if (!topics) return [];
    return ANNUAL_INSPECTION_RITUAL_STEPS.map((flow) => ({
      id: flow.id,
      step: flow.step,
      name: flow.name,
      isRequest: flow.isRequest,
      isChecklist: "isChecklist" in flow ? flow.isChecklist : undefined,
    }));
  }, [topics]);

  const simulatorContext = useMemo((): AnnualInspectionSimulatorContext | null => {
    if (!activePrinter?.fiscalSerial?.trim()) return null;
    return {
      fiscalSerial: activePrinter.fiscalSerial.trim(),
      registroImpresora,
      numeroFacturaPrueba,
      productDescription,
      checklist,
      commandContext,
    };
  }, [
    activePrinter?.fiscalSerial,
    registroImpresora,
    numeroFacturaPrueba,
    productDescription,
    checklist,
    commandContext,
  ]);

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

  const refreshPrinterStatus = useCallback(async (printerId: number) => {
    const updated = await fetchPrinterById(printerId);
    setPrinterStatus(updated);
    return updated;
  }, []);

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
          const first = list.find(isPrinterEligibleForTestInvoice);
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

  useEffect(() => {
    if (ritualComplete) return;
    const step = ritualSteps[activeStepIndex];
    if (!step || step.isChecklist || step.id === "sta-inf") return;
    if (serverCommandsByStepId[step.id]) return;
    if (!topics || !simulatorContext) return;
    if (commandContextLoading || commandContextError) return;
    if (
      step.id === "test-credit-note" &&
      (numeroFacturaPrueba == null || !registroImpresora.trim())
    ) {
      return;
    }
    try {
      const simulation = buildAnnualInspectionServerCommandSimulation(
        step.id as AnnualInspectionRitualStepId,
        simulatorContext,
        topics,
      );
      setServerCommandsByStepId((prev) => ({
        ...prev,
        [step.id]: payloadToInbound(simulation.topic, simulation.payload),
      }));
      if (!sessionStartedAt) {
        setSessionStartedAt(nowIso());
      }
    } catch {
      // El paso permanece bloqueado hasta tener los datos requeridos.
    }
  }, [
    activeStepIndex,
    commandContextError,
    commandContextLoading,
    numeroFacturaPrueba,
    registroImpresora,
    ritualComplete,
    ritualSteps,
    serverCommandsByStepId,
    sessionStartedAt,
    simulatorContext,
    topics,
  ]);

  const getStepActionState = useCallback(
    (index: number): RitualStepActionState | null => {
      const step = ritualSteps[index];
      if (!step || !topics || !simulatorContext) return null;

      const status = stepStatuses[step.id] ?? "pending";
      const locked = index > activeStepIndex;
      const isActive = index === activeStepIndex;
      const isReview = status === "success" && index < activeStepIndex;
      const serverCommand = serverCommandsByStepId[step.id] ?? null;
      const acceptedPrinterResponse =
        acceptedPrinterResponsesByStepId[step.id] ?? null;

      const isMqttStep = !step.isChecklist;
      const serverCommandSimulation =
        isMqttStep && simulatorContext
          ? buildAnnualInspectionServerCommandSimulation(
              step.id as AnnualInspectionRitualStepId,
              simulatorContext,
              topics,
            )
          : null;
      const simulation =
        isMqttStep && simulatorContext
          ? buildAnnualInspectionPrinterSimulationPayload(
              step.id as AnnualInspectionRitualStepId,
              simulatorContext,
              topics,
            )
          : null;

      const canSimulatePrinterResponse = Boolean(serverCommand);
      const creditNoteBlocked =
        step.id === "test-credit-note" &&
        (numeroFacturaPrueba == null || !registroImpresora.trim());
      const simulateDisabled =
        locked ||
        !simulation ||
        commandContextLoading ||
        Boolean(commandContextError) ||
        !canSimulatePrinterResponse ||
        creditNoteBlocked;
      const simulateDisabledReason = locked
        ? "Completa el paso anterior primero."
        : commandContextLoading
          ? "Cargando datos fiscales del cliente…"
          : commandContextError
            ? commandContextError
            : creditNoteBlocked
              ? "Requiere registro (paso 1) y número de factura (paso 3)."
              : !canSimulatePrinterResponse
                ? "Publica primero el comando del servidor en Comando."
                : undefined;

      const publishDisabled =
        locked ||
        !serverCommandSimulation ||
        commandContextLoading ||
        Boolean(commandContextError) ||
        Boolean(serverCommand) ||
        creditNoteBlocked ||
        step.id !== "sta-inf";
      const publishDisabledReason = locked
        ? "Completa el paso anterior primero."
        : step.id !== "sta-inf"
          ? "El comando se publica automáticamente al entrar en este paso."
          : commandContextLoading
            ? "Cargando datos fiscales del cliente…"
            : commandContextError
              ? commandContextError
              : serverCommand
                ? "Comando ya publicado para este paso."
                : undefined;

      const contextLine = step.isChecklist
        ? "Revise el equipo y marque el checklist. Las pruebas Remoto de factura y NC pueden marcar ítems automáticamente."
        : "AEG Core publica en Comando → simula la respuesta de impresora en Respuesta.";

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
        waitingElapsedSeconds: null,
        waitingTimeoutSeconds: null,
        serverCommandSimulation,
        publishDisabled,
        publishDisabledReason,
      };
    },
    [
      ritualSteps,
      topics,
      simulatorContext,
      stepStatuses,
      activeStepIndex,
      serverCommandsByStepId,
      acceptedPrinterResponsesByStepId,
      commandContextLoading,
      commandContextError,
      numeroFacturaPrueba,
      registroImpresora,
    ],
  );

  function resetRitualState() {
    setStepStatuses({});
    setServerCommandsByStepId({});
    setAcceptedPrinterResponsesByStepId({});
    setSessionStartedAt(null);
    setRegistroImpresora("");
    setNumeroFacturaPrueba(null);
    setProductDescription(ANNUAL_INSPECTION_DEFAULT_PRODUCT);
    setChecklist(emptyAnnualInspectionChecklist());
    setDisplayStepIndex(0);
  }

  function handlePrinterChange(value: string) {
    setSelectedId(value ? Number(value) : "");
    setPrinterStatus(null);
    setCommandContext(null);
    setCommandContextError(null);
    resetRitualState();
  }

  function handleServerCommandPublished(stepId: string) {
    const step = ritualSteps.find((item) => item.id === stepId);
    if (!step || !topics || !simulatorContext) return;
    try {
      const simulation = buildAnnualInspectionServerCommandSimulation(
        stepId as AnnualInspectionRitualStepId,
        simulatorContext,
        topics,
      );
      setServerCommandsByStepId((prev) => ({
        ...prev,
        [stepId]: payloadToInbound(simulation.topic, simulation.payload),
      }));
      if (!sessionStartedAt) {
        setSessionStartedAt(nowIso());
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo preparar el comando.",
      );
    }
  }

  function handleStepPublished(stepId: string) {
    const step = ritualSteps.find((item) => item.id === stepId);
    if (!step || !topics || !simulatorContext) return;

    try {
      const simulation = buildAnnualInspectionPrinterSimulationPayload(
        stepId as AnnualInspectionRitualStepId,
        simulatorContext,
        topics,
      );
      const inbound = payloadToInbound(simulation.topic, simulation.payload);
      setAcceptedPrinterResponsesByStepId((prev) => ({
        ...prev,
        [stepId]: inbound,
      }));

      if (stepId === "sta-inf") {
        const registro = parseStaInfRegistroFromResponse(inbound.payload);
        if (registro) {
          setRegistroImpresora(registro);
        } else if (activePrinter?.fiscalSerial?.trim()) {
          setRegistroImpresora(activePrinter.fiscalSerial.trim());
        }
      }

      if (stepId === "test-invoice") {
        const numero = parseTestInvoiceNumberFromResponse(inbound.payload);
        if (numero != null) {
          setNumeroFacturaPrueba(numero);
          setChecklist((current) =>
            applySuccessfulTestInvoice(
              {
                registroImpresora,
                fiscalSerial: activePrinter?.fiscalSerial ?? "",
                printerId: activePrinter?.id ?? 0,
                productDescription,
                numeroFacturaPrueba: numero,
                checklist: current,
              },
              numero,
            ).checklist,
          );
        }
      }

      if (stepId === "test-credit-note") {
        setChecklist((current) =>
          applySuccessfulTestCreditNote({
            registroImpresora,
            fiscalSerial: activePrinter?.fiscalSerial ?? "",
            printerId: activePrinter?.id ?? 0,
            productDescription,
            numeroFacturaPrueba,
            checklist: current,
          }).checklist,
        );
      }

      setStepStatuses((prev) => ({ ...prev, [stepId]: "success" }));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo simular la respuesta.",
      );
    }
  }

  function handleChecklistContinue() {
    setStepStatuses((prev) => ({ ...prev, checklist: "success" }));
    if (!sessionStartedAt) {
      setSessionStartedAt(nowIso());
    }
  }

  function handleChecklistChange(key: AnnualInspectionChecklistKey, checked: boolean) {
    setChecklist((current) => ({ ...current, [key]: checked }));
  }

  function handleProductDescriptionChange(value: string) {
    setProductDescription(value);
    setNumeroFacturaPrueba(null);
    setChecklist((current) =>
      applyProductDescriptionChange(
        {
          registroImpresora,
          fiscalSerial: activePrinter?.fiscalSerial ?? "",
          printerId: activePrinter?.id ?? 0,
          productDescription: value,
          numeroFacturaPrueba,
          checklist: current,
        },
        value,
      ).checklist,
    );
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
    commandContextLoading,
    commandContextError,
    handlePrinterChange,
    handleServerCommandPublished,
    handleStepPublished,
    handleChecklistContinue,
    handleChecklistChange,
    handleProductDescriptionChange,
    handleStepperSelect,
    registroImpresora,
    numeroFacturaPrueba,
    productDescription,
    checklist,
  };
}
