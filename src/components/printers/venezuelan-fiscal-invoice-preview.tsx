"use client";

import {
  FISCAL_TICKET_WIDTH_CH,
  fiscalTicketSeparator,
  formatVenezuelanMoneyAmount,
  parseFiscalMoneyInput,
  syncInvoiceAmounts,
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

const ticketFieldClass =
  "w-full border-0 bg-transparent p-0 text-[11px] leading-tight text-black outline-none focus:bg-white/50 focus:ring-1 focus:ring-black/15";

function TicketSeparator() {
  return (
    <p className="my-1 overflow-hidden tracking-tight text-black/80">
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
}: {
  editable: boolean;
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  ariaLabel: string;
}) {
  if (!editable) {
    return <p className={cn("text-left", className)}>{value}</p>;
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label={ariaLabel}
      className={cn(ticketFieldClass, className)}
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
  if (!editable) {
    return (
      <p className={cn("flex justify-between gap-3", strong && "font-semibold")}>
        <span className="min-w-0">{label}</span>
        <span className="shrink-0">Bs {formatVenezuelanMoneyAmount(amount)}</span>
      </p>
    );
  }
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-3",
        strong && "font-semibold",
      )}
    >
      <span className="min-w-0">{label}</span>
      <span className="inline-flex shrink-0 items-center gap-1">
        Bs
        <input
          type="text"
          inputMode="decimal"
          value={formatVenezuelanMoneyAmount(amount)}
          onChange={(e) => onChange?.(parseFiscalMoneyInput(e.target.value))}
          aria-label={label}
          className={cn(ticketFieldClass, "w-[7.5rem] text-right")}
          style={{ fontFamily: FISCAL_TICKET_FONT }}
        />
      </span>
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
  const isEditable = editable && onChange != null;

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

  function patchMetadatos(
    field: keyof VenezuelanFiscalInvoiceData["metadatos"],
    value: string,
  ) {
    patch((current) => ({
      ...current,
      metadatos: { ...current.metadatos, [field]: value },
    }));
  }

  function patchCliente(
    field: keyof VenezuelanFiscalInvoiceData["cliente"],
    value: string,
  ) {
    patch((current) => ({
      ...current,
      cliente: { ...current.cliente, [field]: value },
    }));
  }

  function patchItem(
    field: keyof NonNullable<typeof item>,
    value: string | number,
  ) {
    if (!item) return;
    patch((current) => {
      const nextItems = [...current.items];
      nextItems[0] = { ...item, [field]: value };
      const next = { ...current, items: nextItems };
      if (field === "precio") {
        return syncInvoiceAmounts(next);
      }
      return next;
    });
  }

  function patchImpuesto(
    field: keyof VenezuelanFiscalInvoiceData["impuestos"],
    value: number,
  ) {
    patch((current) => ({
      ...current,
      impuestos: { ...current.impuestos, [field]: value },
    }));
  }

  function patchPago(
    field: keyof VenezuelanFiscalInvoiceData["pagos"],
    value: string | number,
  ) {
    patch((current) => ({
      ...current,
      pagos: { ...current.pagos, [field]: value },
    }));
  }

  function patchMensaje(index: number, value: string) {
    patch((current) => {
      const mensajes = [...current.piePagina.mensajes];
      mensajes[index] = value;
      return {
        ...current,
        piePagina: { ...current.piePagina, mensajes },
      };
    });
  }

  function patchPiePagina(
    field: "codigoImpresora" | "serialFiscal",
    value: string,
  ) {
    patch((current) => ({
      ...current,
      piePagina: { ...current.piePagina, [field]: value },
    }));
  }

  return (
    <div
      className={cn("ml-6 w-[68ch] max-w-full", className)}
      role="document"
      aria-label="Vista previa de factura fiscal"
    >
      <div
        className="min-h-[520px] bg-[#faf9f6] px-2 py-4 text-[11px] leading-tight text-black shadow-inner"
        style={{
          fontFamily: FISCAL_TICKET_FONT,
          width: `${FISCAL_TICKET_WIDTH_CH}ch`,
        }}
      >
        <header className="space-y-0.5 text-left">
          <TicketText
            editable={isEditable}
            value={data.encabezado.logoTexto}
            onChange={(value) => patchEncabezado("logoTexto", value)}
            className="font-semibold tracking-wide"
            ariaLabel="Logo"
          />
          <p>SENIAT</p>
          <TicketText
            editable={isEditable}
            value={data.encabezado.rifEmpresa}
            onChange={(value) => patchEncabezado("rifEmpresa", value)}
            ariaLabel="RIF empresa"
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.razonSocialEmpresa}
            onChange={(value) => patchEncabezado("razonSocialEmpresa", value)}
            ariaLabel="Razón social empresa"
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.direccionLinea1}
            onChange={(value) => patchEncabezado("direccionLinea1", value)}
            ariaLabel="Dirección línea 1"
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.direccionLinea2}
            onChange={(value) => patchEncabezado("direccionLinea2", value)}
            ariaLabel="Dirección línea 2"
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.tipoDocumento}
            onChange={(value) => patchEncabezado("tipoDocumento", value)}
            ariaLabel="Tipo de documento"
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.rifEmpresa}
            onChange={(value) => patchEncabezado("rifEmpresa", value)}
            ariaLabel="RIF empresa repetido"
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.razonSocialEmpresa}
            onChange={(value) => patchEncabezado("razonSocialEmpresa", value)}
            ariaLabel="Razón social empresa repetida"
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.ubicacion}
            onChange={(value) => patchEncabezado("ubicacion", value)}
            ariaLabel="Ubicación"
          />
        </header>

        <div className="mt-2 space-y-0.5 text-left">
          <div className="flex flex-wrap items-center gap-1">
            <span>FACTURA #:</span>
            <TicketText
              editable={isEditable}
              value={data.metadatos.facturaNro}
              onChange={(value) => patchMetadatos("facturaNro", value)}
              className="inline min-w-[6ch] flex-1"
              ariaLabel="Número de factura"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span>FECHA:</span>
            <TicketText
              editable={isEditable}
              value={data.metadatos.fecha}
              onChange={(value) => patchMetadatos("fecha", value)}
              className="inline w-[10ch]"
              ariaLabel="Fecha"
            />
            <span>HORA:</span>
            <TicketText
              editable={isEditable}
              value={data.metadatos.hora}
              onChange={(value) => patchMetadatos("hora", value)}
              className="inline w-[6ch]"
              ariaLabel="Hora"
            />
          </div>
        </div>

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <p className="font-semibold">DATOS DEL CLIENTE</p>
          <div className="flex flex-wrap items-center gap-1">
            <span>RIF/CI:</span>
            <TicketText
              editable={isEditable}
              value={data.cliente.rifCi}
              onChange={(value) => patchCliente("rifCi", value)}
              className="inline min-w-0 flex-1"
              ariaLabel="RIF o CI del cliente"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span>RAZON SOCIAL:</span>
            <TicketText
              editable={isEditable}
              value={data.cliente.razonSocial}
              onChange={(value) => patchCliente("razonSocial", value)}
              className="inline min-w-0 flex-1"
              ariaLabel="Razón social del cliente"
            />
          </div>
          <TicketText
            editable={isEditable}
            value={data.cliente.condicion}
            onChange={(value) => patchCliente("condicion", value)}
            ariaLabel="Condición del cliente"
          />
        </div>

        <TicketSeparator />

        {item ? (
          <div className="flex items-start justify-between gap-2 text-left">
            <div className="min-w-0 flex-1">
              {isEditable ? (
                <div className="flex flex-wrap items-center gap-1">
                  <TicketText
                    editable
                    value={item.descripcion}
                    onChange={(value) => patchItem("descripcion", value)}
                    className="min-w-0 flex-1"
                    ariaLabel="Descripción del ítem"
                  />
                  <span>
                    (
                    <input
                      type="text"
                      value={item.alicuota}
                      onChange={(e) => patchItem("alicuota", e.target.value)}
                      aria-label="Alícuota del ítem"
                      className={cn(ticketFieldClass, "inline w-[2ch]")}
                      style={{ fontFamily: FISCAL_TICKET_FONT }}
                    />
                    )
                  </span>
                </div>
              ) : (
                <p>
                  {item.descripcion} ({item.alicuota})
                </p>
              )}
            </div>
            {isEditable ? (
              <span className="inline-flex shrink-0 items-center gap-1">
                Bs
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatVenezuelanMoneyAmount(item.precio)}
                  onChange={(e) =>
                    patchItem("precio", parseFiscalMoneyInput(e.target.value))
                  }
                  aria-label="Precio del ítem"
                  className={cn(ticketFieldClass, "w-[7.5rem] text-right")}
                  style={{ fontFamily: FISCAL_TICKET_FONT }}
                />
              </span>
            ) : (
              <span className="shrink-0">
                Bs {formatVenezuelanMoneyAmount(item.precio)}
              </span>
            )}
          </div>
        ) : null}

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <TicketMoney
            editable={isEditable}
            label={`BI ${item?.alicuota ?? "G"} (${data.impuestos.alicuotaGeneralPorcentaje.toFixed(2)}%)`}
            amount={data.impuestos.baseImponibleG}
            onChange={(value) => patchImpuesto("baseImponibleG", value)}
          />
          <TicketMoney
            editable={isEditable}
            label={`IVA ${item?.alicuota ?? "G"} (${data.impuestos.alicuotaGeneralPorcentaje.toFixed(2)}%)`}
            amount={data.impuestos.ivaG}
            onChange={(value) => patchImpuesto("ivaG", value)}
          />
        </div>

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <TicketMoney
            editable={isEditable}
            label="SUBTTL"
            amount={data.impuestos.subtotal}
            onChange={(value) => patchImpuesto("subtotal", value)}
          />
          <TicketMoney
            editable={isEditable}
            label="IVA"
            amount={data.impuestos.ivaTotal}
            onChange={(value) => patchImpuesto("ivaTotal", value)}
          />
        </div>

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <p className="font-semibold">FORMA DE PAGO</p>
          <div className="flex items-center justify-between gap-2">
            <TicketText
              editable={isEditable}
              value={data.pagos.formaPago}
              onChange={(value) => patchPago("formaPago", value)}
              className="min-w-0 flex-1"
              ariaLabel="Forma de pago"
            />
            <TicketMoney
              editable={isEditable}
              label=""
              amount={data.pagos.montoPagado}
              onChange={(value) => patchPago("montoPagado", value)}
            />
          </div>
          <TicketMoney
            editable={isEditable}
            label="CAMBIO"
            amount={data.pagos.cambio}
            onChange={(value) => patchPago("cambio", value)}
          />
        </div>

        <TicketSeparator />

        <TicketMoney
          editable={isEditable}
          label="TOTAL"
          amount={data.pagos.totalGeneral}
          onChange={(value) => patchPago("totalGeneral", value)}
          strong
        />

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <TicketText
            editable={isEditable}
            value={data.piePagina.mensajes[0] ?? ""}
            onChange={(value) => patchMensaje(0, value)}
            ariaLabel="Mensaje 1"
          />
          <TicketText
            editable={isEditable}
            value={data.piePagina.mensajes[1] ?? ""}
            onChange={(value) => patchMensaje(1, value)}
            ariaLabel="Mensaje 2"
          />
        </div>

        <TicketSeparator />

        <div className="flex justify-between gap-2 text-left">
          <TicketText
            editable={isEditable}
            value={data.piePagina.codigoImpresora}
            onChange={(value) => patchPiePagina("codigoImpresora", value)}
            className="w-[4ch]"
            ariaLabel="Código impresora"
          />
          <TicketText
            editable={isEditable}
            value={data.piePagina.serialFiscal}
            onChange={(value) => patchPiePagina("serialFiscal", value)}
            className="min-w-0 flex-1 text-right"
            ariaLabel="Serial fiscal"
          />
        </div>
      </div>
    </div>
  );
}
