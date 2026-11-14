import {
  COMMERCIAL_INVOICE_COLLECTION_STATUSES,
  COMMERCIAL_INVOICE_MODALITIES,
  type CommercialInvoiceCollectionStatus,
  type CommercialInvoiceFormValues,
  type CommercialInvoiceModality,
  type CommercialInvoiceRequest,
  type CommercialInvoiceResponse,
} from "@/types/commercial-invoice";

export const COMMERCIAL_INVOICE_MODALITY_LABELS: Record<
  CommercialInvoiceModality,
  string
> = {
  VENTA: "Venta",
  CONSIGNACION: "Consignación",
  DONACION_REGALO: "Donación / Regalo",
  PRESTAMO: "Préstamo",
  MUESTRA_SENIAT: "Muestra SENIAT",
};

export const COMMERCIAL_INVOICE_COLLECTION_STATUS_LABELS: Record<
  CommercialInvoiceCollectionStatus,
  string
> = {
  PAGADO: "Pagado",
  PAGO_PARCIAL: "Pago parcial",
  DEBE_IVA: "Debe IVA",
  PENDIENTE_PAGO: "Pendiente de pago",
  POR_FACTURAR: "Por facturar",
  SIN_CARGO: "Sin cargo",
};

export function formatCommercialInvoiceTitle(invoice: {
  id: number;
  numeroFactura?: string | null;
  sufijoControl?: string | null;
}): string {
  const numero = invoice.numeroFactura?.trim();
  if (numero) {
    return numero;
  }
  return `Factura #${invoice.id}`;
}

export const emptyCommercialInvoiceForm = (): CommercialInvoiceFormValues => ({
  numeroFactura: "",
  clienteComercialId: "",
  modalidad: "VENTA",
  estadoCobro: "PAGADO",
});

export function commercialInvoiceToFormValues(
  invoice: CommercialInvoiceResponse,
): CommercialInvoiceFormValues {
  return {
    numeroFactura: invoice.numeroFactura ?? "",
    clienteComercialId:
      invoice.clienteComercialId != null
        ? String(invoice.clienteComercialId)
        : "",
    modalidad: COMMERCIAL_INVOICE_MODALITIES.includes(invoice.modalidad)
      ? invoice.modalidad
      : "VENTA",
    estadoCobro: COMMERCIAL_INVOICE_COLLECTION_STATUSES.includes(
      invoice.estadoCobro,
    )
      ? invoice.estadoCobro
      : "PAGADO",
  };
}

function parseOptionalId(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isInteger(num) && num > 0 ? num : null;
}

export function toCommercialInvoiceRequest(
  values: CommercialInvoiceFormValues,
): CommercialInvoiceRequest | string {
  const numeroFactura = values.numeroFactura.trim();
  if (!numeroFactura) {
    return "El número de factura es obligatorio.";
  }
  if (numeroFactura.length > 30) {
    return "El número de factura no puede superar los 30 caracteres.";
  }

  const clienteComercialId = parseOptionalId(values.clienteComercialId);
  if (clienteComercialId == null) {
    return "El cliente es obligatorio.";
  }

  if (!COMMERCIAL_INVOICE_MODALITIES.includes(values.modalidad)) {
    return "Modalidad no válida.";
  }
  if (!COMMERCIAL_INVOICE_COLLECTION_STATUSES.includes(values.estadoCobro)) {
    return "Estado de cobro no válido.";
  }

  return {
    numeroFactura,
    clienteComercialId,
    modalidad: values.modalidad,
    estadoCobro: values.estadoCobro,
  };
}
