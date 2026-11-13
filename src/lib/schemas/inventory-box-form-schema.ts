import { z } from "zod";

export const inventoryBoxFormSchema = z.object({
  boxNumber: z
    .string()
    .trim()
    .min(1, "El número de caja es obligatorio.")
    .refine((value) => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0;
    }, "El número de caja debe ser un entero positivo."),
  observations: z
    .string()
    .max(255, "Las observaciones no pueden superar los 255 caracteres."),
});

export type InventoryBoxFormSchemaValues = z.infer<
  typeof inventoryBoxFormSchema
>;
