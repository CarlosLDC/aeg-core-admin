import { ArrowRight, RefreshCw } from "lucide-react";
import { printerStatusLabel, normalizePrinterStatus } from "@/lib/printer-status";
import type { PrinterStatusQuickAction } from "@/lib/printer-quick-actions";
import type { PrinterStatus } from "@/types/printer";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  de_fabrica:
    "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  sin_asignar:
    "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-200",
  asignada:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  en_consignacion:
    "border-indigo-500/30 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200",
  enajenada:
    "border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-200",
  a_credito:
    "border-cyan-500/30 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200",
  desincorporada:
    "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  laboratorio:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
};

type PrinterStatusBadgeProps = {
  status: PrinterStatus | string;
  title?: string;
};

export function PrinterStatusBadge({
  status,
  title,
}: PrinterStatusBadgeProps) {
  const normalized = normalizePrinterStatus(status);
  const label = printerStatusLabel(status);
  const className = cn(
    "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
    STATUS_STYLES[normalized] ?? STATUS_STYLES.desincorporada,
    title && "cursor-help",
  );

  return (
    <span className={className} title={title}>
      {label}
    </span>
  );
}

type PrinterStatusActionButtonProps = {
  action: PrinterStatusQuickAction;
  size?: "sm" | "md";
};

/** Botón de acción rápida (Asignar / Enajenar / Reconfigurar) junto al estatus de la impresora. */
export function PrinterStatusActionButton({
  action,
  size = "sm",
}: PrinterStatusActionButtonProps) {
  const isReconfigure = action.kind === "reconfigure";
  const Icon = isReconfigure ? RefreshCw : ArrowRight;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        action.onClick();
      }}
      title={action.label}
      aria-label={action.label}
      className={cn(
        "inline-flex cursor-pointer items-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        size === "sm"
          ? "gap-1 rounded-md border px-2 py-0.5 text-xs"
          : "gap-2 rounded-lg border px-3 py-2 text-sm",
        isReconfigure
          ? "border-amber-500/35 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-200"
          : "border-accent/35 bg-accent/10 text-accent hover:bg-accent/20",
      )}
    >
      {size === "md" ? (
        <>
          <Icon className="size-4 shrink-0" aria-hidden />
          {action.label}
        </>
      ) : (
        <>
          {action.buttonLabel}
          <Icon className="size-3 shrink-0 opacity-80" aria-hidden />
        </>
      )}
    </button>
  );
}
