import type {
  EnajenacionSseEvent,
  EnajenacionSseEventType,
} from "@/types/enajenacion-sse";

const WIRE_TO_TYPE: Record<string, EnajenacionSseEventType> = {
  connected: "connected",
  session_started: "session_started",
  step_transition: "step_transition",
  session_completed: "session_completed",
  session_failed: "session_failed",
};

export function parseEnajenacionSseMessage(
  eventName: string,
  rawData: string,
): EnajenacionSseEvent | null {
  const type = WIRE_TO_TYPE[eventName];
  if (!type) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawData) as EnajenacionSseEvent;
    return { ...parsed, type };
  } catch {
    return null;
  }
}

export function mergeAcceptedStepsFromSse(
  current: Set<string>,
  event: EnajenacionSseEvent,
): Set<string> {
  const next = new Set(current);
  if (event.type === "session_started") {
    next.add("request");
    if (event.publishedStepId) {
      // DNF command is live; request step is done once the session starts.
    }
  }
  if (event.type === "step_transition" && event.acceptedStepId) {
    next.add(event.acceptedStepId);
  }
  if (event.type === "session_completed") {
    next.add("report-z");
  }
  return next;
}

export function mergeServerCommandsFromSse(
  current: Record<string, { topic: string; payload: string; receivedAt: string }>,
  event: EnajenacionSseEvent,
): Record<string, { topic: string; payload: string; receivedAt: string }> {
  const next = { ...current };
  const publishedStepId = event.publishedStepId;
  if (
    (event.type === "session_started" || event.type === "step_transition") &&
    publishedStepId &&
    event.comandoTopic &&
    event.comandoPayload
  ) {
    next[publishedStepId] = {
      topic: event.comandoTopic,
      payload: event.comandoPayload,
      receivedAt: event.at,
    };
  }
  return next;
}
