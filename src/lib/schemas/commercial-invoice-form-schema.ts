import { z } from "zod";
import {
  COMMERCIAL_INVOICE_COLLECTION_STATUSES,
  COMMERCIAL_INVOICE_MODALITIES,
} from "@/types/commercial-invoice";

export const commercialInvoiceFormSchema = z
  .object({
    numeroFactura: z
      .string()
      .trim()
      .min(1, "El número de factura es obligatorio.")
      .max(30, "Máximo 30 caracteres."),
    recipientType: z.enum(["DISTRIBUTOR", "CLIENT"]),
    distribuidorId: z.string(),
    clienteId: z.string(),
    modalidad: z.enum(COMMERCIAL_INVOICE_MODALITIES, {
      message: "Modalidad no válida.",
    }),
    estadoCobro: z.enum(COMMERCIAL_INVOICE_COLLECTION_STATUSES, {
      message: "Estado de cobro no válido.",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.recipientType === "DISTRIBUTOR") {
      if (!data.distribuidorId.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["distribuidorId"],
          message: "Debe seleccionar un distribuidor.",
        });
      }
    } else if (!data.clienteId.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["clienteId"],
        message: "Debe seleccionar un cliente.",
      });
    }
  });

export type CommercialInvoiceFormSchemaValues = z.infer<
  typeof commercialInvoiceFormSchema
>;
