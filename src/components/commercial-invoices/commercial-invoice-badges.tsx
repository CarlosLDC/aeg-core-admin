import {
  COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS,
  COMMERCIAL_INVOICE_MODALITY_LABELS,
} from "@/lib/commercial-invoice-form";
import { cn } from "@/lib/utils";
import type {
  CommercialInvoiceCollectionStatus,
  CommercialInvoiceModality,
} from "@/types/commercial-invoice";

const MODALITY_STYLES: Record<CommercialInvoiceModality, string> = {
  VENTA:
    "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  CONSIGNACION:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  DONACION_REGALO:
    "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-200",
  PRESTAMO:
    "border-indigo-500/30 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200",
  MUESTRA_SENIAT:
    "border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-200",
};

const COLLECTION_STATUS_STYLES: Record<
  CommercialInvoiceCollectionStatus,
  string
> = {
  PAGADO:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  PAGO_PARCIAL:
    "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  DEBE_IVA:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  PENDIENTE_PAGO:
    "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200",
  POR_FACTURAR:
    "border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-200",
  SIN_CARGO:
    "border-border bg-foreground/5 text-muted",
};

export function CommercialInvoiceModalityBadge({
  modality,
}: {
  modality: CommercialInvoiceModality;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        MODALITY_STYLES[modality] ?? "border-border bg-foreground/5 text-muted",
      )}
    >
      {COMMERCIAL_INVOICE_MODALITY_LABELS[modality] ?? modality}
    </span>
  );
}

export function CommercialInvoiceCollectionStatusBadge({
  status,
}: {
  status: CommercialInvoiceCollectionStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        COLLECTION_STATUS_STYLES[status] ?? COLLECTION_STATUS_STYLES.SIN_CARGO,
      )}
    >
      {COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS[status] ?? status}
    </span>
  );
}
