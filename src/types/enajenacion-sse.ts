export type EnajenacionSseEventType =
  | "connected"
  | "session_started"
  | "step_transition"
  | "session_completed"
  | "session_failed";

export type EnajenacionSseEvent = {
  type: EnajenacionSseEventType;
  mac: string;
  at: string;
  printerId?: number | null;
  ptrReg?: string | null;
  acceptedStepId?: string | null;
  publishedStepId?: string | null;
  acceptedRespuestaTopic?: string | null;
  acceptedRespuestaPayload?: string | null;
  comandoTopic?: string | null;
  comandoPayload?: string | null;
  sessionState?: string | null;
  reason?: string | null;
  failedAtState?: string | null;
};

export type EnajenacionSseServerCommand = {
  topic: string;
  payload: string;
  receivedAt: string;
};

export type EnajenacionSsePrinterResponse = {
  topic: string;
  payload: string;
  receivedAt: string;
};

export type EnajenacionSseStatus =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "closed";
