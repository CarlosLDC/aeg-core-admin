export const COMMERCIAL_PAYMENT_METHODS = [
  "BNC",
  "BINANCE",
  "ZELLE",
  "DOLARES_EFECTIVO",
  "BCV",
  "OTRO",
] as const;

export type CommercialPaymentMethod =
  (typeof COMMERCIAL_PAYMENT_METHODS)[number];

export type CommercialPaymentResponse = {
  id: number;
  facturaComercialId: number;
  numeroFactura: string | null;
  clienteComercialId: number | null;
  clienteComercialNombre: string | null;
  metodoBanco: CommercialPaymentMethod;
  referencia: string | null;
  monto: number | null;
  cuentaDestino: string | null;
  createdAt: string;
};

export type CommercialPaymentRequest = {
  facturaComercialId: number;
  metodoBanco: CommercialPaymentMethod;
  referencia?: string | null;
  monto?: number | null;
  cuentaDestino?: string | null;
};

export type CommercialPaymentFormValues = {
  facturaComercialId: string;
  metodoBanco: CommercialPaymentMethod;
  referencia: string;
  monto: string;
  cuentaDestino: string;
};
