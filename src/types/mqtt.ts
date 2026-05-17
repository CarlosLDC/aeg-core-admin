export type MqttConnectionProbeResult = {
  success: boolean;
  connected: boolean;
  broker: string;
  durationMs: number;
  message: string;
};

export type MqttPublishRequest = {
  topic: string;
  payload: Record<string, unknown>;
};

export type MqttPublishResponse = {
  status: string;
  topic: string;
  payload: Record<string, unknown>;
  broker: string;
};

export type MqttTestMessageResponse = {
  status: string;
  message: string;
  broker: string;
};
