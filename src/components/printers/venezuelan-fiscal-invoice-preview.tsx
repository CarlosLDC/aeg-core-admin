"use client";

import {
  formatVenezuelanMoneyAmount,
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

function TicketSeparator() {
  return (
    <p className="my-1 tracking-tight text-black/80">
      ----------------------------------------
    </p>
  );
}

function AmountRow({
  label,
  amount,
  strong = false,
}: {
  label: string;
  amount: number;
  strong?: boolean;
}) {
  return (
    <p
      className={cn(
        "flex justify-between gap-3",
        strong && "font-semibold",
      )}
    >
      <span className="min-w-0">{label}</span>
      <span className="shrink-0">Bs {formatVenezuelanMoneyAmount(amount)}</span>
    </p>
  );
}

export function VenezuelanFiscalInvoicePreview({
  data,
  className,
}: VenezuelanFiscalInvoicePreviewProps) {
  const item = data.items[0];

  return (
    <div
      className={cn("w-full max-w-[320px]", className)}
      role="document"
      aria-label="Vista previa de factura fiscal"
    >
      <div
        className="min-h-[520px] bg-[#faf9f6] px-3 py-4 text-[11px] leading-tight text-black shadow-inner"
        style={{ fontFamily: FISCAL_TICKET_FONT }}
      >
        <header className="space-y-0.5 text-left">
          <p className="font-semibold tracking-wide">{data.encabezado.logoTexto}</p>
          <p>SENIAT</p>
          <p>{data.encabezado.rifEmpresa}</p>
          <p>{data.encabezado.razonSocialEmpresa}</p>
          {data.encabezado.direccionLinea1 ? (
            <p>{data.encabezado.direccionLinea1}</p>
          ) : null}
          {data.encabezado.direccionLinea2 ? (
            <p>{data.encabezado.direccionLinea2}</p>
          ) : null}
          <p>{data.encabezado.tipoDocumento}</p>
          <p>{data.encabezado.rifEmpresa}</p>
          <p>{data.encabezado.razonSocialEmpresa}</p>
          <p>{data.encabezado.ubicacion}</p>
        </header>

        <div className="mt-2 space-y-0.5 text-left">
          <p>FACTURA #: {data.metadatos.facturaNro}</p>
          <p>
            FECHA: {data.metadatos.fecha}               HORA:{" "}
            {data.metadatos.hora}
          </p>
        </div>

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <p className="font-semibold">DATOS DEL CLIENTE</p>
          <p>RIF/CI: {data.cliente.rifCi}</p>
          <p>RAZON SOCIAL: {data.cliente.razonSocial}</p>
          <p>{data.cliente.condicion}</p>
        </div>

        <TicketSeparator />

        {item ? (
          <p className="flex justify-between gap-2 text-left">
            <span className="min-w-0">
              {item.descripcion}         ({item.alicuota})
            </span>
            <span className="shrink-0">
              Bs {formatVenezuelanMoneyAmount(item.precio)}
            </span>
          </p>
        ) : null}

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <AmountRow
            label={`BI ${item?.alicuota ?? "G"} (${data.impuestos.alicuotaGeneralPorcentaje.toFixed(2)}%)`}
            amount={data.impuestos.baseImponibleG}
          />
          <AmountRow
            label={`IVA ${item?.alicuota ?? "G"} (${data.impuestos.alicuotaGeneralPorcentaje.toFixed(2)}%)`}
            amount={data.impuestos.ivaG}
          />
        </div>

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <AmountRow label="SUBTTL" amount={data.impuestos.subtotal} />
          <AmountRow label="IVA" amount={data.impuestos.ivaTotal} />
        </div>

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <p className="font-semibold">FORMA DE PAGO</p>
          <AmountRow
            label={data.pagos.formaPago}
            amount={data.pagos.montoPagado}
          />
          <AmountRow label="CAMBIO" amount={data.pagos.cambio} />
        </div>

        <TicketSeparator />

        <AmountRow
          label="TOTAL"
          amount={data.pagos.totalGeneral}
          strong
        />

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          {data.piePagina.mensajes.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>

        <TicketSeparator />

        <p className="flex justify-between gap-2 text-left">
          <span>{data.piePagina.codigoImpresora}</span>
          <span>{data.piePagina.serialFiscal}</span>
        </p>
      </div>
    </div>
  );
}
