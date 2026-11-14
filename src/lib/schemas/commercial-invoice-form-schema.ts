import { z } from "zod";
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
  clienteComercialId: z
    .string()
    .trim()
    .min(1, "El cliente es obligatorio."),
  modalidad: z.enum(COMMERCIAL_INVOICE_MODALITIES, {
    message: "Modalidad no válida.",
  }),
  estadoCobro: z.enum(COMMERCIAL_INVOICE_COLLECTION_STATUSES, {
    message: "Estado de cobro no válido.",
  }),
});

export type CommercialInvoiceFormSchemaValues = z.infer<
  typeof commercialInvoiceFormSchema
>;
