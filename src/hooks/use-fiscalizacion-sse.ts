"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFiscalizacionSseUrl } from "@/lib/mqtt-api";

export type FiscalizacionSseStatus =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "closed";

export type FiscalizacionSseEvent = {
  type: string;
  mac?: string;
  at?: string;
  printerId?: number | null;
  ptrReg?: string | null;
  acceptedStepId?: string | null;
  publishedStepId?: string | null;
  comandoTopic?: string | null;
  comandoPayload?: string | null;
  acceptedRespuestaTopic?: string | null;
  acceptedRespuestaPayload?: string | null;
  sessionState?: string | null;
  reason?: string | null;
  failedAtState?: string | null;
};

const MAX_RECONNECT_DELAY_MS = 15_000;
const MAX_EVENT_LOG = 50;

export function useFiscalizacionSse(mac: string | null, enabled = true) {
  const [status, setStatus] = useState<FiscalizacionSseStatus>("idle");
  const [lastEvent, setLastEvent] = useState<FiscalizacionSseEvent | null>(null);
  const [eventLog, setEventLog] = useState<FiscalizacionSseEvent[]>([]);
  const [acceptedStepIds, setAcceptedStepIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [ackPayload, setAckPayload] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [completedPrinterId, setCompletedPrinterId] = useState<number | null>(
    null,
  );

  const sourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);

  const resetState = useCallback(() => {
    setLastEvent(null);
    setEventLog([]);
    setAcceptedStepIds(new Set());
    setAckPayload(null);
    setSessionError(null);
    setCompletedPrinterId(null);
  }, []);

  const applyEvent = useCallback((event: FiscalizacionSseEvent) => {
    setLastEvent(event);
    setEventLog((prev) => [...prev, event].slice(-MAX_EVENT_LOG));
    if (event.type === "session_failed" && event.reason) {
      setSessionError(event.reason);
    }
    if (event.type === "session_started" || event.type === "session_completed") {
      setSessionError(null);
    }
    if (event.type === "session_started" && event.comandoPayload) {
      setAckPayload(event.comandoPayload);
      setAcceptedStepIds((prev) => new Set([...prev, "request", "ack"]));
    }
    if (event.type === "step_transition" && event.acceptedStepId) {
      setAcceptedStepIds((prev) => new Set([...prev, event.acceptedStepId!]));
    }
    if (event.type === "session_completed") {
      setAcceptedStepIds((prev) => new Set([...prev, "result", "config_spiffs"]));
      if (typeof event.printerId === "number") {
        setCompletedPrinterId(event.printerId);
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const source = sourceRef.current;
    if (source) {
      source.onopen = null;
      source.onerror = null;
      source.onmessage = null;
      source.close();
      sourceRef.current = null;
    }
    setStatus("closed");
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !mac?.trim()) {
      disconnect();
      setStatus("idle");
      return;
    }

    disconnect();
    setStatus(reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting");

    let url: string;
    try {
      url = getFiscalizacionSseUrl(mac);
    } catch {
      setStatus("closed");
      return;
    }

    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => {
      reconnectAttemptRef.current = 0;
      setStatus("open");
    };

    const wireEvents = [
      "connected",
      "session_started",
      "step_transition",
      "session_completed",
      "session_failed",
    ] as const;

    for (const wireName of wireEvents) {
      source.addEventListener(wireName, (message) => {
        try {
          const parsed = JSON.parse(
            (message as MessageEvent<string>).data,
          ) as FiscalizacionSseEvent;
          applyEvent({ ...parsed, type: wireName });
        } catch {
          // ignore malformed SSE payloads
        }
      });
    }

    source.onerror = () => {
      disconnect();
      reconnectAttemptRef.current += 1;
      const delay = Math.min(
        1000 * 2 ** (reconnectAttemptRef.current - 1),
        MAX_RECONNECT_DELAY_MS,
      );
      reconnectTimerRef.current = window.setTimeout(() => connect(), delay);
      setStatus("reconnecting");
    };
  }, [applyEvent, disconnect, enabled, mac]);

  useEffect(() => {
    resetState();
    connect();
    return () => disconnect();
  }, [connect, disconnect, resetState]);

  return {
    status,
    lastEvent,
    eventLog,
    acceptedStepIds,
    ackPayload,
    sessionError,
    completedPrinterId,
    resetState,
  };
}
