import { z } from "zod";
import { DEVICE_TYPES, PRINTER_STATUSES } from "@/types/printer";

const FISCAL_SERIAL_RE = /^[A-Z]{3}[0-9]{7}$/i;
const FIRMWARE_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const MAC_RE = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i;

export const printerFormSchema = z
  .object({
    modelId: z.string().trim().min(1, "El modelo fiscal es obligatorio."),
    softwareId: z.string(),
    clientId: z.string(),
    distributorId: z.string(),
    fiscalSerial: z.string().trim(),
    finalSalePrice: z.string(),
    paid: z.boolean(),
    installationDate: z.string(),
    versionFirmware: z.string(),
    macAddress: z.string(),
    status: z.enum(PRINTER_STATUSES, { message: "Estatus no válido." }),
    deviceType: z.enum(DEVICE_TYPES, { message: "Tipo de dispositivo no válido." }),
  })
  .superRefine((data, ctx) => {
    if (data.fiscalSerial && !FISCAL_SERIAL_RE.test(data.fiscalSerial)) {
      ctx.addIssue({
        code: "custom",
        message: "Serial fiscal: 3 letras y 7 dígitos (ej. ABC1234567).",
        path: ["fiscalSerial"],
      });
    }
    if (data.versionFirmware.trim() && !FIRMWARE_RE.test(data.versionFirmware.trim())) {
      ctx.addIssue({
        code: "custom",
        message: "Firmware: formato x.y.z",
        path: ["versionFirmware"],
      });
    }
    if (data.macAddress.trim() && !MAC_RE.test(data.macAddress.trim())) {
      ctx.addIssue({
        code: "custom",
        message: "MAC: formato AA:BB:CC:DD:EE:FF",
        path: ["macAddress"],
      });
    }
    const price = data.finalSalePrice.trim();
    if (price && (Number.isNaN(Number(price)) || Number(price) < 0)) {
      ctx.addIssue({
        code: "custom",
        message: "Precio de venta no válido.",
        path: ["finalSalePrice"],
      });
    }
  });

export type PrinterFormSchemaValues = z.infer<typeof printerFormSchema>;
