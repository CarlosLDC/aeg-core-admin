import type { PrinterStatus } from "@/types/printer";
import { PRINTER_STATUS_LABELS } from "@/lib/printer-form";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<PrinterStatus, string> = {
  laboratorio:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  activo:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  inactivo:
    "border-border bg-foreground/5 text-muted",
};

type PrinterStatusBadgeProps = {
  status: PrinterStatus;
};

export function PrinterStatusBadge({ status }: PrinterStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? STATUS_STYLES.inactivo,
      )}
    >
      {PRINTER_STATUS_LABELS[status] ?? status}
    </span>
  );
}
