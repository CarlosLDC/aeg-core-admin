import type { PrinterStatus } from "@/types/printer";
import { PRINTER_STATUS_LABELS } from "@/lib/printer-form";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<PrinterStatus, string> = {
  de_demostracion:
    "border-indigo-500/30 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200",
  de_fabrica:
    "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  inicializada:
    "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-200",
  asignada:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  enajenada:
    "border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-200",
  desincorporada:
    "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  laboratorio:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
};

type PrinterStatusBadgeProps = {
  status: PrinterStatus;
};

export function PrinterStatusBadge({ status }: PrinterStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? STATUS_STYLES.desincorporada,
      )}
    >
      {PRINTER_STATUS_LABELS[status] ?? status}
    </span>
  );
}
