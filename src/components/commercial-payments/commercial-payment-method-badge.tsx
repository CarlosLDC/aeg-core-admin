import { COMMERCIAL_PAYMENT_METHOD_LABELS } from "@/lib/commercial-payment-form";
import { cn } from "@/lib/utils";
import type { CommercialPaymentMethod } from "@/types/commercial-payment";

const METHOD_STYLES: Record<CommercialPaymentMethod, string> = {
  BNC: "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-200",
  BINANCE:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  ZELLE:
    "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-200",
  DOLARES_EFECTIVO:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  BCV: "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  OTRO: "border-border bg-foreground/5 text-muted",
};

export function CommercialPaymentMethodBadge({
  method,
}: {
  method: CommercialPaymentMethod;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        METHOD_STYLES[method] ?? METHOD_STYLES.OTRO,
      )}
    >
      {COMMERCIAL_PAYMENT_METHOD_LABELS[method] ?? method}
    </span>
  );
}
