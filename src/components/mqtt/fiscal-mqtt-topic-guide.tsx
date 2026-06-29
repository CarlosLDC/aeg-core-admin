"use client";

import {
  FISCAL_MQTT_COMANDO_RESPUESTA_GUIDE,
  FISCAL_MQTT_TOPIC_SUFFIX,
  fiscalMqttTopicExamples,
} from "@/lib/fiscal-mqtt-topics";

type FiscalMqttTopicGuideProps = {
  macAddress?: string | null;
  className?: string;
};

export function FiscalMqttTopicGuide({ macAddress, className }: FiscalMqttTopicGuideProps) {
  const examples =
    macAddress?.trim() ? fiscalMqttTopicExamples(macAddress) : null;

  return (
    <div
      className={className}
      aria-label="Patrón de tópicos Remoto fiscal"
    >
      <p className="text-sm text-muted">{FISCAL_MQTT_COMANDO_RESPUESTA_GUIDE}</p>
      <dl className="mt-2 space-y-1.5 text-xs text-card-foreground">
        <div>
          <dt className="font-medium text-muted">Servidor → impresora</dt>
          <dd className="font-mono break-all">
            {examples?.comando ?? `/{mac}${FISCAL_MQTT_TOPIC_SUFFIX.COMANDO}`}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-muted">Impresora → servidor</dt>
          <dd className="font-mono break-all">
            {examples?.respuesta ?? `/{mac}${FISCAL_MQTT_TOPIC_SUFFIX.RESPUESTA}`}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-muted">Arranque enajenación (solo impresora)</dt>
          <dd className="font-mono break-all">
            {`/{mac}${FISCAL_MQTT_TOPIC_SUFFIX.CMD_SERVER}`}
          </dd>
        </div>
      </dl>
    </div>
  );
}
