"use client";

import {
  FISCAL_TICKET_WIDTH_CH,
  fiscalTicketSeparator,
  formatVenezuelanMoneyAmount,
  parseFiscalMoneyInput,
  type VenezuelanFiscalInvoiceData,
} from "@/lib/venezuelan-fiscal-invoice";
import { cn } from "@/lib/utils";

type VenezuelanFiscalInvoicePreviewProps = {
  data: VenezuelanFiscalInvoiceData;
  className?: string;
  editable?: boolean;
  onChange?: (data: VenezuelanFiscalInvoiceData) => void;
};

/** TODO: cargar Terminal Roman desde public/fonts con next/font/local cuando exista el .ttf */
const FISCAL_TICKET_FONT =
  '"Liberation Mono", "Courier New", Courier, monospace';

const ticketFieldBase =
  "border-0 bg-transparent p-0 text-[11px] leading-tight text-black outline-none focus:bg-white/50 focus:ring-1 focus:ring-black/15";

/** Columna fija: Bs alineado a la izquierda de la cifra, montos al borde derecho del ticket. */
const ticketAmountColumnClass =
  "inline-grid shrink-0 w-[12ch] grid-cols-[2ch_minmax(0,1fr)] items-baseline tabular-nums whitespace-nowrap";

function TicketAmount({
  editable,
  amount,
  onChange,
  ariaLabel,
  strong = false,
}: {
  editable: boolean;
  amount: number;
  onChange?: (amount: number) => void;
  ariaLabel: string;
  strong?: boolean;
}) {
  const formatted = formatVenezuelanMoneyAmount(amount);

  return (
    <span className={cn(ticketAmountColumnClass, strong && "font-semibold")}>
      <span>Bs</span>
      {editable ? (
        <input
          type="text"
          inputMode="decimal"
          value={formatted}
          onChange={(e) => onChange?.(parseFiscalMoneyInput(e.target.value))}
          aria-label={ariaLabel}
          className={cn(ticketFieldBase, "w-full min-w-0 text-right")}
          style={{ fontFamily: FISCAL_TICKET_FONT }}
        />
      ) : (
        <span className="text-right">{formatted}</span>
      )}
    </span>
  );
}

function TicketSeparator() {
  return (
    <p className="my-1 overflow-hidden text-center tracking-tight text-black/80">
      {fiscalTicketSeparator()}
    </p>
  );
}

function TicketText({
  editable,
  value,
  onChange,
  className,
  ariaLabel,
  centered = false,
  inline = false,
}: {
  editable: boolean;
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  ariaLabel: string;
  centered?: boolean;
  inline?: boolean;
}) {
  const alignClass = centered ? "text-center" : "text-left";

  if (!editable) {
    return <p className={cn(alignClass, className)}>{value}</p>;
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label={ariaLabel}
      className={cn(
        ticketFieldBase,
        inline ? "inline-block w-auto min-w-[4ch]" : "block w-full",
        alignClass,
        className,
      )}
      style={{ fontFamily: FISCAL_TICKET_FONT }}
    />
  );
}

function TicketMoney({
  editable,
  amount,
  onChange,
  label,
  strong = false,
}: {
  editable: boolean;
  amount: number;
  onChange?: (amount: number) => void;
  label: string;
  strong?: boolean;
}) {
  const rowClass = cn("flex items-baseline", strong && "font-semibold");

  if (!editable) {
    return (
      <p className={rowClass}>
        <span className="min-w-0 flex-1">{label}</span>
        <TicketAmount
          editable={false}
          amount={amount}
          ariaLabel={label || "Monto"}
          strong={strong}
        />
      </p>
    );
  }

  return (
    <label className={rowClass}>
      <span className="min-w-0 flex-1">{label}</span>
      <TicketAmount
        editable
        amount={amount}
        onChange={onChange}
        ariaLabel={label || "Monto"}
        strong={strong}
      />
    </label>
  );
}

export function VenezuelanFiscalInvoicePreview({
  data,
  className,
  editable = false,
  onChange,
}: VenezuelanFiscalInvoicePreviewProps) {
  const item = data.items[0];
  const canEdit = editable && onChange != null;
  const isHeaderEditable = canEdit;
  const isTrailerEditable = canEdit;
  const trailerLines =
    data.piePagina.mensajes.length > 0
      ? data.piePagina.mensajes
      : ["", ""];

  function patch(
    updater: (current: VenezuelanFiscalInvoiceData) => VenezuelanFiscalInvoiceData,
  ) {
    if (!onChange) return;
    onChange(updater(data));
  }

  function patchEncabezado(
    field: keyof VenezuelanFiscalInvoiceData["encabezado"],
    value: string,
  ) {
    patch((current) => ({
      ...current,
      encabezado: { ...current.encabezado, [field]: value },
    }));
  }

  function patchTrailerMensaje(index: number, value: string) {
    patch((current) => {
      const mensajes = [...current.piePagina.mensajes];
      while (mensajes.length <= index) mensajes.push("");
      mensajes[index] = value;
      return {
        ...current,
        piePagina: { ...current.piePagina, mensajes },
      };
    });
  }

  return (
    <div className={cn("flex w-full justify-center", className)}>
      <div
        className="min-h-[520px] max-w-full bg-[#faf9f6] px-2 py-4 text-[11px] leading-tight text-black shadow-inner"
        role="document"
        aria-label="Vista previa de factura fiscal"
        style={{
          fontFamily: FISCAL_TICKET_FONT,
          width: `${FISCAL_TICKET_WIDTH_CH}ch`,
        }}
      >
        <header className="space-y-0.5 text-center">
          <TicketText
            editable={isHeaderEditable}
            value={data.encabezado.logoTexto}
            onChange={(value) => patchEncabezado("logoTexto", value)}
            className="font-semibold tracking-wide"
            ariaLabel="Logo"
            centered
          />
          <p>SENIAT</p>
          <TicketText
            editable={isHeaderEditable}
            value={data.encabezado.rifEmpresa}
            onChange={(value) => patchEncabezado("rifEmpresa", value)}
            ariaLabel="RIF empresa"
            centered
          />
          <TicketText
            editable={isHeaderEditable}
            value={data.encabezado.razonSocialEmpresa}
            onChange={(value) => patchEncabezado("razonSocialEmpresa", value)}
            ariaLabel="Razón social empresa"
            centered
          />
          <TicketText
            editable={isHeaderEditable}
            value={data.encabezado.direccionLinea1}
            onChange={(value) => patchEncabezado("direccionLinea1", value)}
            ariaLabel="Dirección línea 1"
            centered
          />
          <TicketText
            editable={isHeaderEditable}
            value={data.encabezado.direccionLinea2}
            onChange={(value) => patchEncabezado("direccionLinea2", value)}
            ariaLabel="Dirección línea 2"
            centered
          />
          <TicketText
            editable={isHeaderEditable}
            value={data.encabezado.tipoDocumento}
            onChange={(value) => patchEncabezado("tipoDocumento", value)}
            ariaLabel="Tipo de documento"
            centered
          />
          <TicketText
            editable={isHeaderEditable}
            value={data.encabezado.ubicacion}
            onChange={(value) => patchEncabezado("ubicacion", value)}
            ariaLabel="Ubicación"
            centered
          />
        </header>

        <div className="mt-2 space-y-0.5 text-center">
          <p>
            FACTURA #:{" "}
            {data.metadatos.facturaNro}
          </p>
          <p className="whitespace-nowrap">
            FECHA:{" "}
            {data.metadatos.fecha}
            {"               HORA: "}
            {data.metadatos.hora}
          </p>
        </div>

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <p className="text-center font-semibold">DATOS DEL CLIENTE</p>
          <div className="flex flex-nowrap items-center gap-1">
            <span className="shrink-0">RIF/CI:</span>
            <TicketText
              editable={false}
              value={data.cliente.rifCi}
              className="min-w-0 flex-1"
              ariaLabel="RIF o CI del cliente"
            />
          </div>
          <div className="flex flex-nowrap items-center gap-1">
            <span className="shrink-0">RAZON SOCIAL:</span>
            <TicketText
              editable={false}
              value={data.cliente.razonSocial}
              className="min-w-0 flex-1"
              ariaLabel="Razón social del cliente"
            />
          </div>
          <TicketText
            editable={false}
            value={data.cliente.condicion}
            ariaLabel="Condición del cliente"
          />
        </div>

        <TicketSeparator />

        {item ? (
          <div className="flex flex-nowrap items-baseline text-left">
            <div className="flex min-w-0 flex-1 flex-nowrap items-baseline gap-0">
              <span className="min-w-0">
                {item.descripcion}
                {"         "}({item.alicuota})
              </span>
            </div>
            <TicketAmount
              editable={false}
              amount={item.precio}
              ariaLabel="Precio del ítem"
            />
          </div>
        ) : null}

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <TicketMoney
            editable={false}
            label={`BI ${item?.alicuota ?? "G"} (${data.impuestos.alicuotaGeneralPorcentaje.toFixed(2)}%)`}
            amount={data.impuestos.baseImponibleG}
          />
          <TicketMoney
            editable={false}
            label={`IVA ${item?.alicuota ?? "G"} (${data.impuestos.alicuotaGeneralPorcentaje.toFixed(2)}%)`}
            amount={data.impuestos.ivaG}
          />
        </div>

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <TicketMoney
            editable={false}
            label="SUBTTL"
            amount={data.impuestos.subtotal}
          />
          <TicketMoney
            editable={false}
            label="IVA"
            amount={data.impuestos.ivaTotal}
          />
        </div>

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <p className="font-semibold">FORMA DE PAGO</p>
          <div className="flex flex-nowrap items-baseline">
            <TicketText
              editable={false}
              value={data.pagos.formaPago}
              className="min-w-0 flex-1"
              ariaLabel="Forma de pago"
            />
            <TicketAmount
              editable={false}
              amount={data.pagos.montoPagado}
              ariaLabel="Monto pagado"
            />
          </div>
          <TicketMoney
            editable={false}
            label="CAMBIO"
            amount={data.pagos.cambio}
          />
        </div>

        <TicketSeparator />

        <TicketMoney
          editable={false}
          label="TOTAL"
          amount={data.pagos.totalGeneral}
          strong
        />

        <TicketSeparator />

        {(isTrailerEditable ||
          trailerLines.some((line) => line.trim().length > 0)) && (
          <>
            <div className="space-y-0.5 text-center">
              {trailerLines.map((line, index) =>
                isTrailerEditable ? (
                  <TicketText
                    key={index}
                    editable
                    value={line}
                    onChange={(value) => patchTrailerMensaje(index, value)}
                    ariaLabel={`Trailer línea ${index + 1}`}
                    centered
                  />
                ) : line.trim().length > 0 ? (
                  <p key={index} className="text-center">
                    {line}
                  </p>
                ) : null,
              )}
            </div>
            <TicketSeparator />
          </>
        )}

        <div className="flex justify-between gap-2 text-left">
          <span className="w-[4ch]">{data.piePagina.codigoImpresora}</span>
          <span className="min-w-0 flex-1 text-right">
            {data.piePagina.serialFiscal}
          </span>
        </div>
      </div>
    </div>
  );
}
