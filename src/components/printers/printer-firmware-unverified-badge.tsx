import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type PrinterFirmwareUnverifiedBadgeProps = {
  className?: string;
};

/** Alerta: se lanzó una actualización de firmware y la impresora no respondió al verificarla. */
export function PrinterFirmwareUnverifiedBadge({ className }: PrinterFirmwareUnverifiedBadgeProps) {
  return (
    <span
      title="Se lanzó una actualización de firmware y la impresora no respondió al verificarla. La versión mostrada puede estar desactualizada."
      className={cn(
        "inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-800 dark:text-sky-200",
        className,
      )}
    >
      <HelpCircle className="size-3 shrink-0" aria-hidden />
      Versión sin verificar
    </span>
  );
}