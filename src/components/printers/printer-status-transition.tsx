import { ArrowRight } from "lucide-react";
import { PrinterStatusBadge } from "@/components/printers/printer-status-badge";
import type { PrinterStatus } from "@/types/printer";

type PrinterStatusTransitionProps = {
  from: PrinterStatus;
  to: PrinterStatus;
};

export function PrinterStatusTransition({
  from,
  to,
}: PrinterStatusTransitionProps) {
  return (
    <div className="rounded-lg border border-border bg-foreground/[0.02] p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Cambio de estado
      </p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <PrinterStatusBadge status={from} />
        <ArrowRight className="size-4 text-muted" aria-hidden />
        <PrinterStatusBadge status={to} />
      </div>
    </div>
  );
}
