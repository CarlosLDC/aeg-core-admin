import { PRINTER_PENDING_MQTT_LABEL } from "@/lib/printer-enajenacion-ticket";
import { cn } from "@/lib/utils";

type PrinterPendingMqttBadgeProps = {
  className?: string;
};

export function PrinterPendingMqttBadge({
  className,
}: PrinterPendingMqttBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-100",
        className,
      )}
      title="Ticket fiscal guardado; falta completar el ritual MQTT en la impresora"
    >
      {PRINTER_PENDING_MQTT_LABEL}
    </span>
  );
}
