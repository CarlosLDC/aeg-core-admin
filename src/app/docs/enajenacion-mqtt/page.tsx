import type { Metadata } from "next";
import { EnajenacionMqttDocsContent } from "@/modules/enajenacion-mqtt-docs/enajenacion-mqtt-docs-content";

export const metadata: Metadata = {
  title: "Enajenación MQTT",
  description:
    "Referencia del protocolo fiscal automatizado entre impresora, broker MQTT y AEG Core",
};

export default function EnajenacionMqttDocsPage() {
  return <EnajenacionMqttDocsContent />;
}
