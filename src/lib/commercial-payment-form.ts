import {
  COMMERCIAL_PAYMENT_METHODS,
  type CommercialPaymentFormValues,
  type CommercialPaymentMethod,
  type CommercialPaymentRequest,
  type CommercialPaymentResponse,
} from "@/types/commercial-payment";

export const COMMERCIAL_PAYMENT_METHOD_LABELS: Record<
  CommercialPaymentMethod,
  string
> = {
  BNC: "BNC",
  BINANCE: "Binance",
  ZELLE: "Zelle",
  DOLARES_EFECTIVO: "Dólares en efectivo",
  BCV: "BCV",
  OTRO: "Otro",
};

export function emptyCommercialPaymentForm(
  defaultInvoiceId?: number | null,
): CommercialPaymentFormValues {
  return {
    facturaComercialId:
      defaultInvoiceId != null ? String(defaultInvoiceId) : "",
    metodoBanco: "BNC",
    referencia: "",
    monto: "",
    cuentaDestino: "",
  };
}

export function commercialPaymentToFormValues(
  payment: CommercialPaymentResponse,
): CommercialPaymentFormValues {
  return {
    facturaComercialId: String(payment.facturaComercialId),
    metodoBanco: COMMERCIAL_PAYMENT_METHODS.includes(payment.metodoBanco)
      ? payment.metodoBanco
      : "OTRO",
    referencia: payment.referencia ?? "",
    monto: payment.monto != null ? String(payment.monto) : "",
    cuentaDestino: payment.cuentaDestino ?? "",
  };
}

function trimToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parsePaymentAmount(raw: string): number | null | "invalid" {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return "invalid";
  }
  return Math.round(parsed * 100) / 100;
}

export function toCommercialPaymentRequest(
  values: CommercialPaymentFormValues,
): CommercialPaymentRequest | string {
  const invoiceId = Number(values.facturaComercialId.trim());
  if (!values.facturaComercialId.trim() || !Number.isInteger(invoiceId) || invoiceId <= 0) {
    return "Selecciona una factura comercial válida.";
  }
  if (!COMMERCIAL_PAYMENT_METHODS.includes(values.metodoBanco)) {
    return "Método / banco no válido.";
  }

  const parsedMonto = parsePaymentAmount(values.monto);
  if (parsedMonto === "invalid") {
    return "El monto debe ser un número mayor o igual a 0.";
  }

  const referencia = trimToNull(values.referencia);
  if (referencia && referencia.length > 100) {
    return "La referencia no puede superar los 100 caracteres.";
  }
  const cuentaDestino = trimToNull(values.cuentaDestino);
  if (cuentaDestino && cuentaDestino.length > 100) {
    return "La cuenta destino no puede superar los 100 caracteres.";
  }

  return {
    facturaComercialId: invoiceId,
    metodoBanco: values.metodoBanco,
    referencia,
    monto: parsedMonto,
    cuentaDestino,
  };
}
