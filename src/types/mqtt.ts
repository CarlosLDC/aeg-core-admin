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

export type MqttPublishResponse = {
  status: string;
  topic: string;
  payload: MqttPublishPayload;
  broker: string;
};

export type MqttTestMessageResponse = {
  status: string;
  message: string;
  broker: string;
};
