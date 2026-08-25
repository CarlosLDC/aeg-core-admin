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
  buildFiscalizacionSpiffsErrorPayload,
  buildFiscalizacionSpiffsSuccessPayload,
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

/** High-level UI phase for a linear, one-action-at-a-time flow. */
export type FiscalizacionPhase =
  | "setup"
  | "waiting_ack"
  | "waiting_result"
  | "waiting_config_spiffs"
  | "done"
  | "failed";

const SESSION_POLL_MS = 5_000;
const REJECT_POLL_MS = 2_000;

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
  const [selectedSealId, setSelectedSealId] = useState("");
  const [seals, setSeals] = useState<SealResponse[]>([]);
  const [sealsLoading, setSealsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [persistentSessionError, setPersistentSessionError] = useState<
    string | null
  >(null);
  const [requestPublished, setRequestPublished] = useState(false);
  const hadActiveSessionRef = useRef(false);
  const publishStartedAtRef = useRef<number | null>(null);

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

  const canStart = useMemo(() => {
    return Boolean(
      form.ptrReg.trim() &&
        topics &&
        form.precintoNro.trim() &&
        form.model.trim(),
    );
  }, [form.model, form.precintoNro, form.ptrReg, topics]);

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

  const hasAck = sse.acceptedStepIds.has("ack");
  const hasResult = sse.acceptedStepIds.has("result");
  const hasConfigSpiffs = sse.acceptedStepIds.has("config_spiffs");

  const completedStepIds = useMemo(() => {
    const done = new Set(sse.acceptedStepIds);
    if (requestPublished) done.add("request");
    return done;
  }, [requestPublished, sse.acceptedStepIds]);

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

  const ritualComplete = hasConfigSpiffs || Boolean(sse.completedPrinterId);

  const phase: FiscalizacionPhase = useMemo(() => {
    if (ritualComplete) return "done";
    if (persistentSessionError) return "failed";
    if (hasResult) return "waiting_config_spiffs";
    if (hasAck) return "waiting_result";
    if (requestPublished) return "waiting_ack";
    return "setup";
  }, [hasAck, hasResult, persistentSessionError, requestPublished, ritualComplete]);

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
    }
  }, [sse.sessionError]);

  useEffect(() => {
    if (sse.lastEvent?.type === "session_started") {
      setPersistentSessionError(null);
      hadActiveSessionRef.current = true;
      setRequestPublished(true);
    }
  }, [sse.lastEvent]);

  // After publishing, look for validation REJECTED (no session created).
  useEffect(() => {
    if (!topics?.mac || !requestPublished || hasAck || ritualComplete) return;
    if (persistentSessionError) return;

    let cancelled = false;
    const startedAt = publishStartedAtRef.current ?? Date.now() - 5_000;

    async function pollRejection() {
      try {
        const activity = await getFiscalizacionActivity({
          mac: topics!.mac,
          limit: 20,
        });
        if (cancelled) return;
        const rejected = activity.entries.find((e) => {
          if (e.result !== "REJECTED") return false;
          const at = Date.parse(e.at);
          return Number.isFinite(at) ? at >= startedAt - 1_000 : true;
        });
        if (rejected) {
          setPersistentSessionError(
            rejected.detail?.trim() ||
              "Core rechazó la solicitud de fiscalización.",
          );
        }
      } catch {
        // best-effort
      }
    }

    void pollRejection();
    const id = window.setInterval(() => void pollRejection(), REJECT_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [
    hasAck,
    persistentSessionError,
    requestPublished,
    ritualComplete,
    topics,
  ]);

  useEffect(() => {
    if (!topics?.mac || ritualComplete || phase === "setup") return;
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
        if (hadActiveSessionRef.current || hasAck) {
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
  }, [hasAck, phase, ritualComplete, topics]);

  const updateForm = useCallback(
    (patch: Partial<FiscalizacionFormValues>) => {
      setForm((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const selectSeal = useCallback(
    (sealId: string) => {
      setSelectedSealId(sealId);
      if (!sealId) {
        setForm((prev) => ({
          ...prev,
          precintoNro: "",
          precintoColor: "Azul",
        }));
        return;
      }
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
    if (!canStart || !topics) {
      toast.error("Completa registro, MAC y precinto.");
      return;
    }
    setBusy(true);
    try {
      await publishMqttMessage({
        topic: topics.cmdServer,
        payload: buildPtrFiscalizarPayload(form) as MqttPublishPayload,
      });
      publishStartedAtRef.current = Date.now();
      setRequestPublished(true);
      setPersistentSessionError(null);
      hadActiveSessionRef.current = false;
      toast.success("Solicitud enviada. Esperando ACK de Core…");
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [canStart, form, toast, topics]);

  const publishRemotoKickoff = useCallback(async () => {
    if (!canStart || !topics) {
      toast.error("Completa registro, MAC y precinto.");
      return;
    }
    setBusy(true);
    try {
      await publishMqttMessage({
        topic: topics.comando,
        payload: buildPtrFiscalizarRemotoPayload(form) as MqttPublishPayload,
      });
      toast.success("Comando enviado a la impresora.");
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [canStart, form, toast, topics]);

  const simulateResult = useCallback(
    async (ok: boolean) => {
      if (!topics || !hasAck) {
        toast.error("Espera el ACK del servidor antes de simular el resultado.");
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
          ok ? "Resultado OK simulado." : "Resultado de error simulado.",
        );
      } catch (err) {
        toast.error(getMqttErrorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [hasAck, toast, topics],
  );

  const simulateConfigSpiffsResult = useCallback(
    async (ok: boolean) => {
      if (!topics || !hasResult) {
        toast.error("Espera el resultado de fiscalización antes de simular la configuración.");
        return;
      }
      setBusy(true);
      try {
        await publishMqttMessage({
          topic: topics.respuesta,
          payload: (ok
            ? buildFiscalizacionSpiffsSuccessPayload()
            : buildFiscalizacionSpiffsErrorPayload()) as MqttPublishPayload,
        });
        toast.success(
          ok ? "Configuración de impuestos OK simulada." : "Configuración de impuestos con error simulada.",
        );
      } catch (err) {
        toast.error(getMqttErrorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [hasResult, toast, topics],
  );

  const reset = useCallback(() => {
    setForm(DEFAULT_FORM);
    setSelectedSealId("");
    setShowAdvanced(false);
    setRequestPublished(false);
    setPersistentSessionError(null);
    hadActiveSessionRef.current = false;
    publishStartedAtRef.current = null;
    sse.resetState();
  }, [sse]);

  const refreshSeals = useCallback(async () => {
    setSealsLoading(true);
    try {
      const list = await fetchSeals();
      setSeals(list);
    } catch (err) {
      toast.error(getMqttErrorMessage(err));
    } finally {
      setSealsLoading(false);
    }
  }, [toast]);

  return {
    form,
    updateForm,
    selectedSealId,
    sealsLoading,
    availableSeals,
    selectSeal,
    refreshSeals,
    showAdvanced,
    setShowAdvanced,
    topics,
    ritualSteps,
    stepStatuses,
    activeStepIndex,
    ritualComplete,
    phase,
    canStart,
    hasAck,
    hasResult,
    hasConfigSpiffs,
    busy,
    persistentSessionError,
    ackPayload: sse.ackPayload,
    completedPrinterId: sse.completedPrinterId,
    sseStatus: sse.status,
    publishRequest,
    publishRemotoKickoff,
    simulateResult,
    simulateConfigSpiffsResult,
    reset,
  };
}
