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
  numeroFactura: string;
  empresaId: number | null;
  empresaNombre: string | null;
  empresaRif: string | null;
  clienteComercialId: number | null;
  clienteComercialNombre: string | null;
  modalidad: CommercialInvoiceModality;
  estadoCobro: CommercialInvoiceCollectionStatus;
  montoTotal?: number | null;
  remainingBalance?: number | null;
  createdAt: string;
  paymentCount: number;
  paidAmountTotal: number;
  printerCount: number;
};

export type CommercialInvoiceRequest = {
  numeroFactura: string;
  empresaId: number;
  modalidad: CommercialInvoiceModality;
  estadoCobro: CommercialInvoiceCollectionStatus;
  montoTotal?: number | null;
};

export type CommercialInvoiceFormValues = {
  numeroFactura: string;
  empresaId: string;
  modalidad: CommercialInvoiceModality;
  estadoCobro: CommercialInvoiceCollectionStatus;
  montoTotal: string;
};

export type CommercialInvoicePrintersRequest = {
  printerIds: number[];
};
