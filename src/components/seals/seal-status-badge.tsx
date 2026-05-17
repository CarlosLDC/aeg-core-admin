import { SEAL_STATUS_LABELS } from "@/lib/seal-form";
import type { SealStatus } from "@/types/seal";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<SealStatus, string> = {
  disponible:
    "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  en_impresora:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  sustituido:
    "border-border bg-foreground/5 text-muted",
};

type SealStatusBadgeProps = {
  status: SealStatus;
};

export function SealStatusBadge({ status }: SealStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? STATUS_STYLES.sustituido,
      )}
    >
      {SEAL_STATUS_LABELS[status] ?? status}
    </span>
  );
}
