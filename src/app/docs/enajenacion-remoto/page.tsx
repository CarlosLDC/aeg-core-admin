import type { Metadata } from "next";
import { EnajenacionMqttDocsContent } from "@/modules/enajenacion-mqtt-docs/enajenacion-mqtt-docs-content";

export const metadata: Metadata = {
  title: "Enajenación Remoto",
  description:
    "Referencia del protocolo fiscal automatizado entre impresora, broker Remoto y AEG Core",
};

export default function EnajenacionMqttDocsPage() {
  return <EnajenacionMqttDocsContent />;
}
