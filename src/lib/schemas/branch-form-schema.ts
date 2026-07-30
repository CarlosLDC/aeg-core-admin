import { z } from "zod";
import { BRANCH_ORGANIZATION_ROLES } from "@/types/organization";

const branchFormBaseSchema = z.object({
  companyId: z
    .string()
    .trim()
    .min(1, "Selecciona una empresa."),
  city: z.string().trim().min(1, "La ciudad es obligatoria."),
  state: z.string().trim().min(1, "El estado es obligatorio."),
  contactPersonName: z.string().trim().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Correo electrónico no válido.",
    }),
  organizationRole: z.enum(BRANCH_ORGANIZATION_ROLES),
  isClient: z.boolean(),
  clientDistributorId: z.string(),
  canWriteAnnualInspection: z.boolean(),
});

export const branchFormSchema = branchFormBaseSchema.extend({
  address: z.string().trim().min(1, "La dirección es obligatoria."),
});

export const branchCreateFormSchema = branchFormBaseSchema.extend({
  address: z.string().trim().min(1, "La dirección es obligatoria."),
});

export type BranchFormSchemaValues = z.infer<typeof branchFormSchema>;
export type BranchCreateFormSchemaValues = z.infer<typeof branchCreateFormSchema>;
