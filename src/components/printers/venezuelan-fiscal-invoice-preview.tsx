"use client";

import type { ReactNode } from "react";
import {
  formatFiscalInvoiceDateTime,
  type VenezuelanFiscalInvoiceData,
} from "@/lib/venezuelan-fiscal-invoice";
import { cn } from "@/lib/utils";

type VenezuelanFiscalInvoicePreviewProps = {
  data: VenezuelanFiscalInvoiceData;
  className?: string;
};

/** TODO: cargar Terminal Roman desde public/fonts con next/font/local cuando exista el .ttf */
const FISCAL_TICKET_FONT =
  '"Liberation Mono", "Courier New", Courier, monospace';

function TicketLine({ children }: { children: ReactNode }) {
  return <p className="whitespace-pre-wrap text-center leading-snug">{children}</p>;
}

function TicketSeparator() {
  return <p className="my-1 text-center tracking-tight">--------------------------------</p>;
}

export function VenezuelanFiscalInvoicePreview({
  data,
  className,
}: VenezuelanFiscalInvoicePreviewProps) {
  const issuedLabel = formatFiscalInvoiceDateTime(data.issuedAt);

  return (
    <div
      className={cn("mx-auto w-full max-w-[280px]", className)}
      role="document"
      aria-label="Vista previa de factura fiscal"
    >
      <div
        className="relative min-h-[420px] bg-[#faf9f6] px-3 py-4 text-[11px] leading-tight text-black shadow-inner"
        style={{ fontFamily: FISCAL_TICKET_FONT }}
      >
        <header className="space-y-0.5">
          <TicketLine>{data.seniatLabel}</TicketLine>
          <TicketLine>{data.rif}</TicketLine>
          <TicketLine>{data.businessName}</TicketLine>
          <TicketLine>{data.address}</TicketLine>
        </header>

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <p>
            <span className="font-semibold">Factura N°:</span> {data.invoiceNumber}
          </p>
          <p>
            <span className="font-semibold">Fecha:</span> {issuedLabel}
          </p>
        </div>

        <TicketSeparator />

        <div className="space-y-1 text-left">
          <p className="font-semibold">Descripción</p>
          <p>{data.itemDescription}</p>
          <p>Cant: {data.quantity}</p>
        </div>

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <p className="flex justify-between gap-2">
            <span>Sub-Total Bs:</span>
            <span>{data.subtotalFormatted}</span>
          </p>
          <p className="flex justify-between gap-2">
            <span>I.V.A. Bs:</span>
            <span>{data.taxFormatted}</span>
          </p>
          <p className="flex justify-between gap-2 font-semibold">
            <span>Total Bs:</span>
            <span>{data.totalFormatted}</span>
          </p>
        </div>

        <TicketSeparator />

        <p className="absolute bottom-3 right-3 text-[10px] tracking-tight">
          {data.fiscalSerial}
        </p>
      </div>
    </div>
  );
}
