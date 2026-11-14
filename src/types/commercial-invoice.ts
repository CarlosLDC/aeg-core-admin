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

export type CommercialInvoiceResponse = {
  id: number;
  numeroFactura: string | null;
  sufijoControl: string | null;
  facturaCliente: string | null;
  modalidad: CommercialInvoiceModality;
  estadoCobro: CommercialInvoiceCollectionStatus;
  promotorVendedor: string | null;
  notasComerciales: string | null;
  createdAt: string;
  paymentCount: number;
  paidAmountTotal: number;
  printerCount: number;
};

export type CommercialInvoiceRequest = {
  numeroFactura?: string | null;
  sufijoControl?: string | null;
  facturaCliente?: string | null;
  modalidad: CommercialInvoiceModality;
  estadoCobro: CommercialInvoiceCollectionStatus;
  promotorVendedor?: string | null;
  notasComerciales?: string | null;
};

export type CommercialInvoiceFormValues = {
  numeroFactura: string;
  sufijoControl: string;
  facturaCliente: string;
  modalidad: CommercialInvoiceModality;
  estadoCobro: CommercialInvoiceCollectionStatus;
  promotorVendedor: string;
  notasComerciales: string;
};
