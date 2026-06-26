import { z } from "zod";
import { CONTRIBUTOR_TYPES } from "@/types/company";
import { RIF_PATTERN } from "@/lib/seniat-extract";

export const companyFormSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, "La razón social es obligatoria."),
  rif: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => RIF_PATTERN.test(v), {
      message: "Formato: letra V, E, J, P o G seguida de 7 a 9 dígitos.",
    }),
  contributorType: z.enum(CONTRIBUTOR_TYPES, {
    message: "El tipo de contribuyente es obligatorio.",
  }),
});

export type CompanyFormSchemaValues = z.infer<typeof companyFormSchema>;
