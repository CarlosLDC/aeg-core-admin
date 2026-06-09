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

const ticketFieldBase =
  "border-0 bg-transparent p-0 text-[11px] leading-tight text-black outline-none focus:bg-white/50 focus:ring-1 focus:ring-black/15";

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
          aria-label={label || "Monto"}
          className={cn(ticketFieldBase, "w-[7.5rem] text-right")}
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
        <header className="space-y-0.5 text-center">
          <TicketText
            editable={isEditable}
            value={data.encabezado.logoTexto}
            onChange={(value) => patchEncabezado("logoTexto", value)}
            className="font-semibold tracking-wide"
            ariaLabel="Logo"
            centered
          />
          <p>SENIAT</p>
          <TicketText
            editable={isEditable}
            value={data.encabezado.rifEmpresa}
            onChange={(value) => patchEncabezado("rifEmpresa", value)}
            ariaLabel="RIF empresa"
            centered
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.razonSocialEmpresa}
            onChange={(value) => patchEncabezado("razonSocialEmpresa", value)}
            ariaLabel="Razón social empresa"
            centered
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.direccionLinea1}
            onChange={(value) => patchEncabezado("direccionLinea1", value)}
            ariaLabel="Dirección línea 1"
            centered
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.direccionLinea2}
            onChange={(value) => patchEncabezado("direccionLinea2", value)}
            ariaLabel="Dirección línea 2"
            centered
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.tipoDocumento}
            onChange={(value) => patchEncabezado("tipoDocumento", value)}
            ariaLabel="Tipo de documento"
            centered
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.rifEmpresa}
            onChange={(value) => patchEncabezado("rifEmpresa", value)}
            ariaLabel="RIF empresa repetido"
            centered
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.razonSocialEmpresa}
            onChange={(value) => patchEncabezado("razonSocialEmpresa", value)}
            ariaLabel="Razón social empresa repetida"
            centered
          />
          <TicketText
            editable={isEditable}
            value={data.encabezado.ubicacion}
            onChange={(value) => patchEncabezado("ubicacion", value)}
            ariaLabel="Ubicación"
            centered
          />
        </header>

        <div className="mt-2 space-y-0.5 text-center">
          <p>
            FACTURA #:{" "}
            {isEditable ? (
              <input
                type="text"
                value={data.metadatos.facturaNro}
                onChange={(e) => patchMetadatos("facturaNro", e.target.value)}
                aria-label="Número de factura"
                className={cn(ticketFieldBase, "inline-block w-[8ch] text-center")}
                style={{ fontFamily: FISCAL_TICKET_FONT }}
              />
            ) : (
              data.metadatos.facturaNro
            )}
          </p>
          <p className="whitespace-nowrap">
            FECHA:{" "}
            {isEditable ? (
              <input
                type="text"
                value={data.metadatos.fecha}
                onChange={(e) => patchMetadatos("fecha", e.target.value)}
                aria-label="Fecha"
                className={cn(ticketFieldBase, "inline-block w-[10ch] text-center")}
                style={{ fontFamily: FISCAL_TICKET_FONT }}
              />
            ) : (
              data.metadatos.fecha
            )}
            {"               HORA: "}
            {isEditable ? (
              <input
                type="text"
                value={data.metadatos.hora}
                onChange={(e) => patchMetadatos("hora", e.target.value)}
                aria-label="Hora"
                className={cn(ticketFieldBase, "inline-block w-[5ch] text-center")}
                style={{ fontFamily: FISCAL_TICKET_FONT }}
              />
            ) : (
              data.metadatos.hora
            )}
          </p>
        </div>

        <TicketSeparator />

        <div className="space-y-0.5 text-left">
          <p className="text-center font-semibold">DATOS DEL CLIENTE</p>
          <div className="flex flex-nowrap items-center gap-1">
            <span className="shrink-0">RIF/CI:</span>
            <TicketText
              editable={isEditable}
              value={data.cliente.rifCi}
              onChange={(value) => patchCliente("rifCi", value)}
              className="min-w-0 flex-1"
              ariaLabel="RIF o CI del cliente"
              inline={isEditable}
            />
          </div>
          <div className="flex flex-nowrap items-center gap-1">
            <span className="shrink-0">RAZON SOCIAL:</span>
            <TicketText
              editable={isEditable}
              value={data.cliente.razonSocial}
              onChange={(value) => patchCliente("razonSocial", value)}
              className="min-w-0 flex-1"
              ariaLabel="Razón social del cliente"
              inline={isEditable}
            />
          </div>
          <TicketText
            editable={isEditable}
            value={data.cliente.condicion}
            onChange={(value) => patchCliente("condicion", value)}
            ariaLabel="Condición del cliente"
            inline={isEditable}
          />
        </div>

        <TicketSeparator />

        {item ? (
          <div className="flex flex-nowrap items-baseline justify-between gap-2 text-left">
            <div className="flex min-w-0 flex-1 flex-nowrap items-baseline gap-0">
              {isEditable ? (
                <>
                  <input
                    type="text"
                    value={item.descripcion}
                    onChange={(e) => patchItem("descripcion", e.target.value)}
                    aria-label="Descripción del ítem"
                    className={cn(
                      ticketFieldBase,
                      "min-w-0 flex-1",
                    )}
                    style={{ fontFamily: FISCAL_TICKET_FONT }}
                  />
                  <span className="shrink-0 whitespace-nowrap">
                    {"         "}({item.alicuota})
                  </span>
                </>
              ) : (
                <span className="min-w-0">
                  {item.descripcion}
                  {"         "}({item.alicuota})
                </span>
              )}
            </div>
            {isEditable ? (
              <span className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap">
                Bs
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatVenezuelanMoneyAmount(item.precio)}
                  onChange={(e) =>
                    patchItem("precio", parseFiscalMoneyInput(e.target.value))
                  }
                  aria-label="Precio del ítem"
                  className={cn(ticketFieldBase, "w-[7ch] text-right")}
                  style={{ fontFamily: FISCAL_TICKET_FONT }}
                />
              </span>
            ) : (
              <span className="shrink-0 whitespace-nowrap">
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
          <div className="flex flex-nowrap items-center justify-between gap-2">
            <TicketText
              editable={isEditable}
              value={data.pagos.formaPago}
              onChange={(value) => patchPago("formaPago", value)}
              className="min-w-0 flex-1"
              ariaLabel="Forma de pago"
              inline={isEditable}
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

        <div className="space-y-0.5 text-center">
          <TicketText
            editable={isEditable}
            value={data.piePagina.mensajes[0] ?? ""}
            onChange={(value) => patchMensaje(0, value)}
            ariaLabel="Mensaje 1"
            centered
          />
          <TicketText
            editable={isEditable}
            value={data.piePagina.mensajes[1] ?? ""}
            onChange={(value) => patchMensaje(1, value)}
            ariaLabel="Mensaje 2"
            centered
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
            inline={isEditable}
          />
          <TicketText
            editable={isEditable}
            value={data.piePagina.serialFiscal}
            onChange={(value) => patchPiePagina("serialFiscal", value)}
            className="min-w-0 flex-1 text-right"
            ariaLabel="Serial fiscal"
            inline={isEditable}
          />
        </div>
      </div>
    </div>
  );
}
