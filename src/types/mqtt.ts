export type MqttConnectionProbeResult = {
  success: boolean;
  connected: boolean;
  broker: string;
  durationMs: number;
  message: string;
};

/** Objeto JSON o array de valores JSON (p. ej. lote de mensajes). */
export type MqttPublishPayload = Record<string, unknown> | unknown[];

export type MqttPublishRequest = {
  topic: string;
  payload: MqttPublishPayload;
};

export type MqttPublishEnajenacionStatus =
  | "SKIPPED"
  | "STARTED"
  | "REJECTED"
  | "ALREADY_COMPLETED";

export type MqttPublishEnajenacionResult = {
  status: MqttPublishEnajenacionStatus;
  message: string | null;
};

export type MqttPublishResponse = {
  status: string;
  topic: string;
  payload: MqttPublishPayload;
  broker: string;
  enajenacion?: MqttPublishEnajenacionResult | null;
};

export type EnajenacionMqttPrecheckResponse = {
  ready: boolean;
  message: string | null;
};

export type MqttTestMessageResponse = {
  status: string;
  message: string;
  broker: string;
};

export type MqttMonitorStatus = {
  inboundEnabled: boolean;
  subscribedTopic: string;
  brokerUrl: string;
  connected: boolean;
  lastMessageAt: string | null;
  bufferedMessageCount: number;
};

export type MqttSubscriptionResponse = {
  topic: string;
  active: boolean;
};

export type MqttInboundMessage = {
  topic: string;
  payload: string;
  receivedAt: string;
  qos?: number | null;
};

export type MqttMonitorWireMessage = {
  type: "message" | "subscription" | "pong";
  topic?: string;
  payload?: string;
  receivedAt?: string;
  qos?: number | null;
};

export type EnajenacionActivityDirection = "INBOUND" | "OUTBOUND";

export type EnajenacionActivityResult =
  | "RECEIVED"
  | "PROCESSED"
  | "PUBLISHED"
  | "IGNORED"
  | "REJECTED"
  | "FAILED"
  | "COMPLETED";

export type EnajenacionActivityEntry = {
  id: string;
  at: string;
  mac: string;
  printerId: number | null;
  ptrReg: string | null;
  direction: EnajenacionActivityDirection | null;
  topic: string | null;
  payload: string | null;
  result: EnajenacionActivityResult;
  detail: string | null;
  sessionState: string | null;
};

export type EnajenacionActivityListResponse = {
  entries: EnajenacionActivityEntry[];
  total: number;
};

export type EnajenacionActiveSession = {
  mac: string;
  printerId: number;
  ptrReg: string;
  state: string;
  startedAt: string;
  lastError: string | null;
  awaitingResponse: boolean;
  awaitingSince: string | null;
  timeoutSeconds: number | null;
};
