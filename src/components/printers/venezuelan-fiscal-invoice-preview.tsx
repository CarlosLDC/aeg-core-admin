"use client";

import { useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Minus,
  Pencil,
  Plus,
} from "lucide-react";
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

const ticketEditableField =
  "w-full min-w-0 rounded border border-dashed border-accent/45 bg-white/70 px-1.5 py-0.5 text-[11px] leading-tight text-black outline-none transition-colors placeholder:text-black/35 focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/25";

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
        ticketEditableField,
        inline ? "inline-block w-auto min-w-[4ch]" : "block",
        alignClass,
        className,
      )}
      style={{ fontFamily: FISCAL_TICKET_FONT }}
      placeholder="Escriba una línea…"
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

function reorderArrayItems<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function TicketZoneEditButton({
  label,
  isEditing,
  onClick,
}: {
  label: string;
  isEditing: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isEditing}
      aria-label={
        isEditing
          ? `Terminar edición del ${label.toLowerCase()}`
          : `Editar ${label.toLowerCase()}`
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium shadow-sm transition-colors",
        isEditing
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border/60 bg-card text-muted hover:border-accent/40 hover:text-foreground",
      )}
    >
      {isEditing ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Pencil className="size-3.5" aria-hidden />
      )}
      {label}
    </button>
  );
}

function EditableTicketZone({
  label,
  isEditing,
  onFinishEditing,
  onAddLine,
  children,
  className,
}: {
  label: string;
  isEditing: boolean;
  onFinishEditing: () => void;
  onAddLine?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className} aria-label={label}>
      {isEditing ? (
        <div
          className="rounded-md border border-accent/35 bg-accent/[0.06] px-2 py-2"
          aria-label={`${label} en edición`}
        >
          <div className="mb-2 flex items-center justify-between gap-2 font-sans">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-accent">
              <span
                className="size-1.5 shrink-0 rounded-full bg-accent"
                aria-hidden
              />
              {label}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              {onAddLine ? (
                <button
                  type="button"
                  onClick={onAddLine}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-accent transition-colors hover:bg-accent/10"
                >
                  <Plus className="size-3" aria-hidden />
                  Añadir línea
                </button>
              ) : null}
              <button
                type="button"
                onClick={onFinishEditing}
                className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-card px-2 py-0.5 text-[10px] font-medium text-accent transition-colors hover:bg-accent/10"
              >
                <Check className="size-3" aria-hidden />
                Listo
              </button>
            </div>
          </div>
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function EditableTicketLineList({
  lines,
  isEditing,
  centered = false,
  lineLabelPrefix,
  emptyEditingHint,
  minLines = 1,
  onChangeLine,
  onRemoveLine,
  onMoveLine,
}: {
  lines: string[];
  isEditing: boolean;
  centered?: boolean;
  lineLabelPrefix: string;
  emptyEditingHint?: string;
  minLines?: number;
  onChangeLine: (index: number, value: string) => void;
  onRemoveLine: (index: number) => void;
  onMoveLine: (fromIndex: number, toIndex: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!isEditing) {
    return (
      <>
        {lines.map((line, index) =>
          line.trim().length > 0 ? (
            <p key={`${lineLabelPrefix}-view-${index}`} className={cn(centered && "text-center")}>
              {line}
            </p>
          ) : null,
        )}
      </>
    );
  }

  if (lines.length === 0 && emptyEditingHint) {
    return (
      <p className="font-sans text-[10px] text-muted">{emptyEditingHint}</p>
    );
  }

  return (
    <>
      {lines.map((line, index) => {
        const ariaLabel = `${lineLabelPrefix} línea ${index + 1}`;
        const canRemove = lines.length > minLines;
        const canMoveUp = index > 0;
        const canMoveDown = index < lines.length - 1;

        return (
          <div
            key={`${lineLabelPrefix}-edit-${index}`}
            draggable
            onDragStart={() => {
              setDragIndex(index);
              setDragOverIndex(index);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOverIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex != null) onMoveLine(dragIndex, index);
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setDragOverIndex(null);
            }}
            className={cn(
              "group flex items-center gap-0.5 rounded-sm transition-colors",
              dragOverIndex === index &&
                dragIndex !== null &&
                dragIndex !== index &&
                "bg-accent/10 ring-1 ring-accent/30",
            )}
          >
            <button
              type="button"
              className="inline-flex shrink-0 cursor-grab touch-none rounded p-0.5 text-muted/60 active:cursor-grabbing hover:text-foreground"
              aria-label={`Mover ${ariaLabel.toLowerCase()}`}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <GripVertical className="size-3.5" aria-hidden />
            </button>
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                disabled={!canMoveUp}
                onClick={() => onMoveLine(index, index - 1)}
                aria-label={`Subir ${ariaLabel.toLowerCase()}`}
                className="inline-flex rounded p-0.5 text-muted/70 enabled:hover:bg-foreground/5 enabled:hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp className="size-3" aria-hidden />
              </button>
              <button
                type="button"
                disabled={!canMoveDown}
                onClick={() => onMoveLine(index, index + 1)}
                aria-label={`Bajar ${ariaLabel.toLowerCase()}`}
                className="inline-flex rounded p-0.5 text-muted/70 enabled:hover:bg-foreground/5 enabled:hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown className="size-3" aria-hidden />
              </button>
            </div>
            <TicketText
              editable
              value={line}
              onChange={(value) => onChangeLine(index, value)}
              ariaLabel={ariaLabel}
              centered={centered}
              className="min-w-0 flex-1"
            />
            {canRemove ? (
              <button
                type="button"
                onClick={() => onRemoveLine(index)}
                aria-label={`Eliminar ${ariaLabel.toLowerCase()}`}
                className="inline-flex shrink-0 rounded p-0.5 text-muted/70 opacity-70 transition-all hover:bg-rose-500/10 hover:text-rose-600 hover:opacity-100 group-hover:opacity-100"
              >
                <Minus className="size-3.5" aria-hidden />
              </button>
            ) : (
              <span className="size-5 shrink-0" aria-hidden />
            )}
          </div>
        );
      })}
    </>
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
  const [headerEditing, setHeaderEditing] = useState(false);
  const [trailerEditing, setTrailerEditing] = useState(false);
  const headerLines = data.encabezado.lineas;
  const trailerLines = data.piePagina.mensajes;
  const hasTrailerContent = trailerLines.some((line) => line.trim().length > 0);
  const showTrailerSection = hasTrailerContent || trailerEditing || canEdit;

  function patch(
    updater: (current: VenezuelanFiscalInvoiceData) => VenezuelanFiscalInvoiceData,
  ) {
    if (!onChange) return;
    onChange(updater(data));
  }

  function patchHeaderLine(index: number, value: string) {
    patch((current) => {
      const lineas = [...current.encabezado.lineas];
      lineas[index] = value;
      return { ...current, encabezado: { lineas } };
    });
  }

  function addHeaderLine() {
    patch((current) => ({
      ...current,
      encabezado: { lineas: [...current.encabezado.lineas, ""] },
    }));
  }

  function removeHeaderLine(index: number) {
    patch((current) => ({
      ...current,
      encabezado: {
        lineas: current.encabezado.lineas.filter((_, i) => i !== index),
      },
    }));
  }

  function moveHeaderLine(fromIndex: number, toIndex: number) {
    patch((current) => ({
      ...current,
      encabezado: {
        lineas: reorderArrayItems(current.encabezado.lineas, fromIndex, toIndex),
      },
    }));
  }

  function patchTrailerLine(index: number, value: string) {
    patch((current) => {
      const mensajes = [...current.piePagina.mensajes];
      mensajes[index] = value;
      return {
        ...current,
        piePagina: { ...current.piePagina, mensajes },
      };
    });
  }

  function addTrailerLine() {
    patch((current) => ({
      ...current,
      piePagina: {
        ...current.piePagina,
        mensajes: [...current.piePagina.mensajes, ""],
      },
    }));
  }

  function removeTrailerLine(index: number) {
    patch((current) => ({
      ...current,
      piePagina: {
        ...current.piePagina,
        mensajes: current.piePagina.mensajes.filter((_, i) => i !== index),
      },
    }));
  }

  function moveTrailerLine(fromIndex: number, toIndex: number) {
    patch((current) => ({
      ...current,
      piePagina: {
        ...current.piePagina,
        mensajes: reorderArrayItems(
          current.piePagina.mensajes,
          fromIndex,
          toIndex,
        ),
      },
    }));
  }

  return (
    <div className={cn("mx-auto w-fit max-w-full font-sans", className)}>
      <div className="w-fit max-w-full rounded-xl border border-border/60 bg-card/40 px-3 py-4 shadow-sm">
        {canEdit ? (
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
            <TicketZoneEditButton
              label="Encabezado"
              isEditing={headerEditing}
              onClick={() => setHeaderEditing((current) => !current)}
            />
            <TicketZoneEditButton
              label="Trailer"
              isEditing={trailerEditing}
              onClick={() => setTrailerEditing((current) => !current)}
            />
          </div>
        ) : null}

        <div
          className="min-h-[520px] max-w-full shrink-0 bg-[#faf9f6] px-2 py-4 text-[11px] leading-tight text-black shadow-inner"
          role="document"
          aria-label="Vista previa de factura fiscal"
          style={{
            fontFamily: FISCAL_TICKET_FONT,
            width: `${FISCAL_TICKET_WIDTH_CH}ch`,
          }}
        >
            <EditableTicketZone
              label="Encabezado"
              isEditing={headerEditing}
              onFinishEditing={() => setHeaderEditing(false)}
              onAddLine={headerEditing ? addHeaderLine : undefined}
            >
              <header className="space-y-1 text-center">
                <EditableTicketLineList
                  lines={headerLines}
                  isEditing={headerEditing}
                  centered
                  lineLabelPrefix="Encabezado"
                  minLines={1}
                  onChangeLine={patchHeaderLine}
                  onRemoveLine={removeHeaderLine}
                  onMoveLine={moveHeaderLine}
                />
              </header>
            </EditableTicketZone>

            <div className="mt-2 space-y-0.5 text-left">
              <div className="flex flex-nowrap items-baseline justify-between gap-2">
                <span className="shrink-0">FACTURA #:</span>
                <span className="shrink-0 tabular-nums">
                  {data.metadatos.facturaNro}
                </span>
              </div>
              <div className="flex flex-nowrap items-baseline justify-between gap-2">
                <span className="shrink-0 tabular-nums">
                  FECHA: {data.metadatos.fecha}
                </span>
                <span className="shrink-0 tabular-nums">
                  HORA: {data.metadatos.hora}
                </span>
              </div>
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

            {showTrailerSection ? (
              <>
                <EditableTicketZone
                  label="Trailer"
                  isEditing={trailerEditing}
                  onFinishEditing={() => setTrailerEditing(false)}
                  onAddLine={trailerEditing ? addTrailerLine : undefined}
                >
                  <div className="space-y-1 text-center">
                    <EditableTicketLineList
                      lines={trailerLines}
                      isEditing={trailerEditing}
                      centered
                      lineLabelPrefix="Trailer"
                      emptyEditingHint="Sin líneas. Añade un mensaje de cierre."
                      minLines={0}
                      onChangeLine={patchTrailerLine}
                      onRemoveLine={removeTrailerLine}
                      onMoveLine={moveTrailerLine}
                    />
                  </div>
                </EditableTicketZone>
                {(hasTrailerContent || trailerEditing) && <TicketSeparator />}
              </>
            ) : null}

            <div className="flex justify-between gap-2 text-left">
              <span className="w-[4ch]">{data.piePagina.codigoImpresora}</span>
              <span className="min-w-0 flex-1 text-right">
                {data.piePagina.serialFiscal}
              </span>
            </div>
        </div>
      </div>
    </div>
  );
}
