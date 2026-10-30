import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type PrinterFirmwareUpdateBadgeProps = {
  className?: string;
  title?: string;
};

export function PrinterFirmwareUpdateBadge({
  className,
  title = "Requiere actualización de firmware",
}: PrinterFirmwareUpdateBadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200",
        className,
      )}
    >
      <AlertTriangle className="size-3 shrink-0" aria-hidden />
      Actualización requerida
    </span>
  );
}
