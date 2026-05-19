import { z } from "zod";
import { SEAL_COLORS, SEAL_STATUSES } from "@/types/seal";

export const sealFormSchema = z.object({
  printerId: z.string(),
  serial: z.string().trim().min(1, "El serial del precinto es obligatorio."),
  installationDate: z.string(),
  removalDate: z.string(),
  color: z.enum(SEAL_COLORS, { message: "Color no válido." }),
  status: z.enum(SEAL_STATUSES, { message: "Estatus no válido." }),
});

export type SealFormSchemaValues = z.infer<typeof sealFormSchema>;
