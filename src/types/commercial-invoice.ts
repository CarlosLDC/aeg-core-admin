export const COMMERCIAL_INVOICE_MODALITIES = [
  "VENTA",
  "CONSIGNACION",
  "DONACION_REGALO",
  "PRESTAMO",
  "MUESTRA_SENIAT",
] as const;

export type CommercialInvoiceModality =
  (typeof COMMERCIAL_INVOICE_MODALITIES)[number];

export const COMMERCIAL_INVOICE_COLLECTION_STATUSES = [
  "PAGADO",
  "PAGO_PARCIAL",
  "DEBE_IVA",
  "PENDIENTE_PAGO",
  "POR_FACTURAR",
  "SIN_CARGO",
] as const;

export type CommercialInvoiceCollectionStatus =
  (typeof COMMERCIAL_INVOICE_COLLECTION_STATUSES)[number];

export type CommercialClientResponse = {
  id: number;
  nombre: string;
  rif: string | null;
  notas: string | null;
  activo: boolean;
  createdAt: string;
};

export type CommercialClientRequest = {
  nombre: string;
  rif?: string | null;
  notas?: string | null;
  activo?: boolean;
};

export type CommercialInvoiceResponse = {
  id: number;
  numeroFactura: string;
  clienteComercialId: number | null;
  clienteComercialNombre: string | null;
  modalidad: CommercialInvoiceModality;
  estadoCobro: CommercialInvoiceCollectionStatus;
  createdAt: string;
  paymentCount: number;
  paidAmountTotal: number;
  printerCount: number;
  sufijoControl?: string | null;
  notasComerciales?: string | null;
};

export type CommercialInvoiceRequest = {
  numeroFactura: string;
  clienteComercialId: number;
  modalidad: CommercialInvoiceModality;
  estadoCobro: CommercialInvoiceCollectionStatus;
};

export type CommercialInvoiceFormValues = {
  numeroFactura: string;
  clienteComercialId: string;
  modalidad: CommercialInvoiceModality;
  estadoCobro: CommercialInvoiceCollectionStatus;
};
