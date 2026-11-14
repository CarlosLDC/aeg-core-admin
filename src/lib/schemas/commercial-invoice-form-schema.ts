import { z } from "zod";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUSES,
  COMMERCIAL_INVOICE_MODALITIES,
} from "@/types/commercial-invoice";

export const commercialInvoiceFormSchema = z.object({
  numeroFactura: z
    .string()
    .trim()
    .max(30, "Máximo 30 caracteres."),
  sufijoControl: z
    .string()
    .trim()
    .max(10, "Máximo 10 caracteres."),
  facturaCliente: z
    .string()
    .trim()
    .max(50, "Máximo 50 caracteres."),
  modalidad: z.enum(COMMERCIAL_INVOICE_MODALITIES, {
    message: "Modalidad no válida.",
  }),
  estadoCobro: z.enum(COMMERCIAL_INVOICE_COLLECTION_STATUSES, {
    message: "Estado de cobro no válido.",
  }),
  promotorVendedor: z
    .string()
    .trim()
    .max(100, "Máximo 100 caracteres."),
  notasComerciales: z
    .string()
    .max(5000, "Máximo 5000 caracteres."),
});

export type CommercialInvoiceFormSchemaValues = z.infer<
  typeof commercialInvoiceFormSchema
>;
