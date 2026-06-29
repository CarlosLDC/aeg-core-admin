import type { AnnualInspectionResponse } from "@/types/annual-inspection";

export function hasAnnualInspectionMqttAudit(
  inspection: Pick<
    AnnualInspectionResponse,
    "mqttRegistroImpresora" | "mqttSetDateRevOAt" | "mqttNumeroFacturaPrueba"
  >,
): boolean {
  return (
    Boolean(inspection.mqttRegistroImpresora?.trim()) ||
    inspection.mqttSetDateRevOAt != null ||
    inspection.mqttNumeroFacturaPrueba != null
  );
}

/** Timestamp enviado en SetDateRevO (segundos Unix, ajuste Venezuela naive). */
export function formatMqttSetDateRevOAt(
  value: number | null | undefined,
): string {
  if (value == null) return "—";
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${new Intl.DateTimeFormat("es", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)} (${value})`;
}
