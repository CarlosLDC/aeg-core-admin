import { z } from "zod";
import { parseInvoiceAmount } from "@/lib/commercial-invoice-form";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUSES,
  COMMERCIAL_INVOICE_MODALITIES,
} from "@/types/commercial-invoice";

export const commercialInvoiceFormSchema = z.object({
  numeroFactura: z
    .string()
    .trim()
    .min(1, "El número de factura es obligatorio.")
    .max(30, "Máximo 30 caracteres."),
  empresaId: z
    .string()
    .trim()
    .min(1, "La empresa es obligatoria."),
  modalidad: z.enum(COMMERCIAL_INVOICE_MODALITIES, {
    message: "Modalidad no válida.",
  }),
  estadoCobro: z.enum(COMMERCIAL_INVOICE_COLLECTION_STATUSES, {
    message: "Estado de cobro no válido.",
  }),
  montoTotal: z
    .string()
    .refine(
      (value) => parseInvoiceAmount(value) !== "invalid",
      "Ingresa un monto numérico mayor o igual a 0.",
    ),
});

export type CommercialInvoiceFormSchemaValues = z.infer<
  typeof commercialInvoiceFormSchema
>;
