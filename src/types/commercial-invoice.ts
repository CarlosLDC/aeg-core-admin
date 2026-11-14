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

export type CommercialPromoterResponse = {
  id: number;
  nombre: string;
  activo: boolean;
  createdAt: string;
};

export type CommercialPromoterRequest = {
  nombre: string;
  activo?: boolean;
};

export type CommercialInvoiceResponse = {
  id: number;
  numeroFactura: string | null;
  sufijoControl: string | null;
  clienteComercialId: number | null;
  clienteComercialNombre: string | null;
  modalidad: CommercialInvoiceModality;
  estadoCobro: CommercialInvoiceCollectionStatus;
  promotorId: number | null;
  promotorNombre: string | null;
  notasComerciales: string | null;
  createdAt: string;
  paymentCount: number;
  paidAmountTotal: number;
  printerCount: number;
};

export type CommercialInvoiceRequest = {
  numeroFactura?: string | null;
  sufijoControl?: string | null;
  clienteComercialId?: number | null;
  modalidad: CommercialInvoiceModality;
  estadoCobro: CommercialInvoiceCollectionStatus;
  promotorId?: number | null;
  notasComerciales?: string | null;
};

export type CommercialInvoiceFormValues = {
  numeroFactura: string;
  sufijoControl: string;
  clienteComercialId: string;
  modalidad: CommercialInvoiceModality;
  estadoCobro: CommercialInvoiceCollectionStatus;
  promotorId: string;
  notasComerciales: string;
};
