import {
  compactMac,
  fiscalComandoTopic,
  fiscalRespuestaTopic,
} from "@/lib/enajenacion-mqtt-protocol";

export {
  compactMac,
  fiscalCmdServerTopic,
  fiscalComandoTopic,
  fiscalRespuestaTopic,
  isFiscalCmdServerTopic,
  isFiscalComandoTopic,
  isFiscalRespuestaTopic,
} from "@/lib/enajenacion-mqtt-protocol";

/** Sufijos de tópico fiscal (MAC sin separadores va antes). */
export const FISCAL_MQTT_TOPIC_SUFFIX = {
  CMD_SERVER: "/AEG_Fiscal/Integracion/CmdServer",
  COMANDO: "/AEG_Fiscal/Integracion/Comando",
  RESPUESTA: "/AEG_Fiscal/Integracion/Respuesta",
  DOCUMENTO: "/AEG_Fiscal/Integracion/Documento",
} as const;

export type FiscalMqttTopicExample = {
  comando: string;
  respuesta: string;
};

/** Ejemplos de tópicos para una MAC concreta (12 hex sin separadores). */
export function fiscalMqttTopicExamples(macAddress: string): FiscalMqttTopicExample {
  const normalized = compactMac(macAddress);
  return {
    comando: fiscalComandoTopic(normalized),
    respuesta: fiscalRespuestaTopic(normalized),
  };
}

/** Texto breve del patrón Comando / Respuesta (inspección anual y pasos 2–7 de enajenación). */
export const FISCAL_MQTT_COMANDO_RESPUESTA_GUIDE =
  "AEG Core publica en Comando; la impresora responde en Respuesta. CmdServer solo lo usa la impresora al arrancar con ptrEnajenar (enajenación).";
