"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/context/toast-provider";
import {
  getFiscalizacionActiveSessions,
  getFiscalizacionActivity,
  getMqttErrorMessage,
  publishMqttMessage,
} from "@/lib/mqtt-api";
import { fetchSeals } from "@/lib/seals-api";
import { useFiscalizacionSse } from "@/hooks/use-fiscalizacion-sse";
import {
  FISCALIZACION_FLOW_STEPS,
  buildFiscalizacionResultErrorPayload,
  buildFiscalizacionResultSuccessPayload,
  buildPtrFiscalizarPayload,
  buildPtrFiscalizarRemotoPayload,
  colorLabelForSeal,
  fiscalizacionTopics,
  type FiscalizacionFormValues,
} from "@/lib/fiscalizacion-mqtt-protocol";
import type { SealResponse } from "@/types/seal";
import type { MqttPublishPayload } from "@/types/mqtt";
import type { RitualStep } from "@/hooks/use-enajenacion-ritual";

export type FiscalizacionRitualStepStatus = "pending" | "success";

const SESSION_POLL_MS = 8_000;

const DEFAULT_FORM: FiscalizacionFormValues = {
  ptrReg: "",
  mac: "",
  precintoNro: "",
  precintoColor: "Azul",
  firmwareVersion: "1.1.0",
  model: "AEG-R1",
};

export function useFiscalizacionRitual() {
  const toast = useToast();
  const [form, setForm] = useState<FiscalizacionFormValues>(DEFAULT_FORM);
  const [seals, setSeals] = useState<SealResponse[]>([]);
  const [sealsLoading, setSealsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [persistentSessionError, setPersistentSessionError] = useState<
    string | null
  >(null);
  const [panelAckedRequest, setPanelAckedRequest] = useState(false);
  const hadActiveSessionRef = useRef(false);

  const topics = useMemo(() => {
    if (!form.mac.trim()) return null;
    try {
      return fiscalizacionTopics(form.mac);
    } catch {
      return null;
    }
  }, [form.mac]);

  const sse = useFiscalizacionSse(topics?.mac ?? null, Boolean(topics));

  const availableSeals = useMemo(
    () => seals.filter((s) => s.status === "disponible" && s.printerId == null),
    [seals],
  );

  const ritualSteps = useMemo<RitualStep[]>(
    () =>
      FISCALIZACION_FLOW_STEPS.map((step) => ({
        id: step.id,
        step: step.step,
        name: step.name,
        isRequest: step.isRequest,
      })),
    [],
  );

  const completedStepIds = useMemo(() => {
    const done = new Set(sse.acceptedStepIds);
    if (panelAckedRequest) done.add("request");
    return done;
  }, [panelAckedRequest, sse.acceptedStepIds]);

  const stepStatuses = useMemo(() => {
    const next: Record<string, FiscalizacionRitualStepStatus> = {};
    for (const step of ritualSteps) {
      next[step.id] = completedStepIds.has(step.id) ? "success" : "pending";
    }
    return next;
  }, [completedStepIds, ritualSteps]);

  const activeStepIndex = useMemo(() => {
    const index = ritualSteps.findIndex(
      (step) => stepStatuses[step.id] !== "success",
    );
    return index === -1 ? ritualSteps.length : index;
  }, [ritualSteps, stepStatuses]);

  const ritualComplete = activeStepIndex >= ritualSteps.length;

  useEffect(() => {
    let cancelled = false;
    setSealsLoading(true);
    void fetchSeals()
      .then((list) => {
        if (!cancelled) setSeals(list);
      })
      .catch((err) => {
        if (!cancelled) toast.error(getMqttErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setSealsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (sse.sessionError) {
      setPersistentSessionError(sse.sessionError);
      toast.error(sse.sessionError);
    }
  }, [sse.sessionError, toast]);

  useEffect(() => {
    if (sse.lastEvent?.type === "session_started") {
      setPersistentSessionError(null);
      hadActiveSessionRef.current = true;
    }
  }, [sse.lastEvent]);

  useEffect(() => {
    if (!topics?.mac || ritualComplete) return;
    let cancelled = false;

    async function poll() {
      try {
        const sessions = await getFiscalizacionActiveSessions();
        if (cancelled) return;
        const match = sessions.find(
          (s) => s.mac.toUpperCase() === topics!.mac.toUpperCase(),
        );
        if (match) {
          hadActiveSessionRef.current = true;
          return;
        }
        if (hadActiveSessionRef.current || completedStepIds.has("ack")) {
          const activity = await getFiscalizacionActivity({
            mac: topics!.mac,
            limit: 30,
          });
          if (cancelled) return;
          const failed = activity.entries.find((e) => e.result === "FAILED");
          if (failed) {
            setPersistentSessionError(
              failed.detail?.trim() ||
                "La sesión de fiscalización falló en el servidor.",
            );
          }
        }
      } catch {
        // best-effort
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), SESSION_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [completedStepIds, ritualComplete, topics]);

  const updateForm = useCallback(
    (patch: Partial<FiscalizacionFormValues>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const selectSeal = useCallback(
    (sealId: string) => {
      const seal = availableSeals.find((s) => String(s.id) === sealId);
      if (!seal) return;
      setForm((prev) => ({
        ...prev,
        precintoNro: seal.serial,
        precintoColor: colorLabelForSeal(seal.color),
      }));
    },
    [availableSeals],
  );

  const publishRequest = useCallback(async () => {
    if (!topics) {
      toast.error("Indica una MAC válida.");
      return;
    }
    setBusy(true);
    try {
      await publishMqttMessage({
        topic: topics.cmdServer,
        payload: buildPtrFiscalizarPayload(form) as MqttPublishPayload,
      });
      setPanelAckedRequest(true);
      setPersistentSessionError(null);
      hadActiveSessionRef.current = false;
      toast.success("ptrFiscalizar publicado en CmdServer.");
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [form, toast, topics]);

  const publishRemotoKickoff = useCallback(async () => {
    if (!topics) {
      toast.error("Indica una MAC válida.");
      return;
    }
    setBusy(true);
    try {
      await publishMqttMessage({
        topic: topics.comando,
        payload: buildPtrFiscalizarRemotoPayload(form) as MqttPublishPayload,
      });
      toast.success("ptrFiscalizarRemoto publicado en Comando (hardware).");
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [form, toast, topics]);

  const simulateResult = useCallback(
    async (ok: boolean) => {
      if (!topics) {
        toast.error("Indica una MAC válida.");
        return;
      }
      setBusy(true);
      try {
        await publishMqttMessage({
          topic: topics.respuesta,
          payload: (ok
            ? buildFiscalizacionResultSuccessPayload()
            : buildFiscalizacionResultErrorPayload()) as MqttPublishPayload,
        });
        toast.success(
          ok
            ? "Resultado de éxito simulado en Respuesta."
            : "Resultado de error simulado en Respuesta.",
        );
      } catch (err) {
        toast.error(getMqttErrorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [toast, topics],
  );

  const reset = useCallback(() => {
    setForm(DEFAULT_FORM);
    setPanelAckedRequest(false);
    setPersistentSessionError(null);
    hadActiveSessionRef.current = false;
    sse.resetState();
  }, [sse]);

  return {
    form,
    updateForm,
    sealsLoading,
    availableSeals,
    selectSeal,
    topics,
    ritualSteps,
    stepStatuses,
    activeStepIndex,
    ritualComplete,
    busy,
    persistentSessionError,
    ackPayload: sse.ackPayload,
    completedPrinterId: sse.completedPrinterId,
    sseStatus: sse.status,
    publishRequest,
    publishRemotoKickoff,
    simulateResult,
    reset,
  };
}
