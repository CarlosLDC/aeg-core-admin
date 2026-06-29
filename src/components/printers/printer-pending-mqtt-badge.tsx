import { cn } from "@/lib/utils";

const PENDING_MQTT_TITLE =
  "Pendiente enajenación Remoto: ticket fiscal guardado; falta completar el ritual en la impresora";

type PrinterPendingMqttBadgeProps = {
  className?: string;
};

export function PrinterPendingMqttBadge({
  className,
}: PrinterPendingMqttBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex size-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_0_2px] shadow-amber-400/25 animate-pulse",
        className,
      )}
      title={PENDING_MQTT_TITLE}
      aria-label={PENDING_MQTT_TITLE}
      role="status"
    />
  );
}
