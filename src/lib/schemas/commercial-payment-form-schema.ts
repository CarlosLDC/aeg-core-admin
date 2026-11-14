import { z } from "zod";
import { parsePaymentAmount } from "@/lib/commercial-payment-form";
import { COMMERCIAL_PAYMENT_METHODS } from "@/types/commercial-payment";

export const commercialPaymentFormSchema = z.object({
  facturaComercialId: z
    .string()
    .trim()
    .min(1, "La factura comercial es obligatoria.")
    .refine((value) => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0;
    }, "Selecciona una factura comercial válida."),
  metodoBanco: z.enum(COMMERCIAL_PAYMENT_METHODS, {
    message: "Método / banco no válido.",
  }),
  referencia: z
    .string()
    .trim()
    .max(100, "Máximo 100 caracteres."),
  monto: z
    .string()
    .refine(
      (value) => parsePaymentAmount(value) !== "invalid",
      "Ingresa un monto numérico mayor o igual a 0.",
    ),
  cuentaDestino: z
    .string()
    .trim()
    .max(100, "Máximo 100 caracteres."),
});

export type CommercialPaymentFormSchemaValues = z.infer<
  typeof commercialPaymentFormSchema
>;
