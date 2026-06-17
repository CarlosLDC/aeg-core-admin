"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getEnajenacionSseUrl } from "@/lib/mqtt-api";
import {
  mergeAcceptedStepsFromSse,
  mergeServerCommandsFromSse,
  parseEnajenacionSseMessage,
} from "@/lib/enajenacion-sse";
import type {
  EnajenacionSseEvent,
  EnajenacionSseServerCommand,
  EnajenacionSseStatus,
} from "@/types/enajenacion-sse";

const MAX_RECONNECT_DELAY_MS = 15_000;

export function useEnajenacionSse(mac: string | null, enabled = true) {
  const [status, setStatus] = useState<EnajenacionSseStatus>("idle");
  const [lastEvent, setLastEvent] = useState<EnajenacionSseEvent | null>(null);
  const [acceptedStepIds, setAcceptedStepIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [serverCommandsByStepId, setServerCommandsByStepId] = useState<
    Record<string, EnajenacionSseServerCommand>
  >({});
  const [sessionError, setSessionError] = useState<string | null>(null);

  const sourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);

  const resetProgress = useCallback(() => {
    setLastEvent(null);
    setAcceptedStepIds(new Set());
    setServerCommandsByStepId({});
    setSessionError(null);
  }, []);

  const resetState = useCallback(() => {
    resetProgress();
  }, [resetProgress]);

  const applyEvent = useCallback((event: EnajenacionSseEvent) => {
    setLastEvent(event);
    if (event.type === "session_failed" && event.reason) {
      setSessionError(event.reason);
    }
    if (event.type === "session_started" || event.type === "session_completed") {
      setSessionError(null);
    }
    setAcceptedStepIds((prev) => mergeAcceptedStepsFromSse(prev, event));
    setServerCommandsByStepId((prev) => mergeServerCommandsFromSse(prev, event));
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
      url = getEnajenacionSseUrl(mac);
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
        const event = parseEnajenacionSseMessage(
          wireName,
          (message as MessageEvent<string>).data,
        );
        if (event) {
          applyEvent(event);
        }
      });
    }

    source.onerror = () => {
      disconnect();
      reconnectAttemptRef.current += 1;
      const delay = Math.min(
        1_000 * 2 ** (reconnectAttemptRef.current - 1),
        MAX_RECONNECT_DELAY_MS,
      );
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, delay);
    };
  }, [applyEvent, disconnect, enabled, mac]);

  useEffect(() => {
    resetState();
    reconnectAttemptRef.current = 0;
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect, mac, enabled, resetState]);

  return {
    status,
    lastEvent,
    acceptedStepIds,
    serverCommandsByStepId,
    sessionError,
    reconnect: connect,
    resetProgress,
  };
}
