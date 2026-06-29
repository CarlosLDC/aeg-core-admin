import type { Metadata } from "next";
import { AnnualInspectionMqttDocsContent } from "@/modules/annual-inspection-mqtt-docs/annual-inspection-mqtt-docs-content";

export const metadata: Metadata = {
  title: "Inspección anual Remoto — Libro fiscal",
  description:
    "Referencia del ritual Remoto de inspección anual obligatoria en el libro fiscal y pruebas del panel admin",
};

export default function AnnualInspectionMqttDocsPage() {
  return <AnnualInspectionMqttDocsContent />;
}
