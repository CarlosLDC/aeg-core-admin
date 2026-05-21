import { z } from "zod";

export const branchFormSchema = z.object({
  companyId: z
    .string()
    .trim()
    .min(1, "Selecciona una empresa."),
  city: z.string().trim().min(1, "La ciudad es obligatoria."),
  state: z.string().trim().min(1, "El estado es obligatorio."),
  address: z.string().optional(),
  contactPersonName: z
    .string()
    .trim()
    .min(1, "El nombre de la persona de contacto es obligatorio."),
  phone: z.string().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Correo electrónico no válido.",
    }),
  isClient: z.boolean(),
  isDistributor: z.boolean(),
  isServiceCenter: z.boolean(),
  clientDistributorId: z.string(),
});

export type BranchFormSchemaValues = z.infer<typeof branchFormSchema>;
