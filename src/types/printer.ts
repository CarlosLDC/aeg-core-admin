export const PRINTER_STATUSES = [
  "de_fabrica",
  "sin_asignar",
  "asignada",
  "enajenada",
  "desincorporada",
  "laboratorio",
] as const;
export type PrinterStatus = (typeof PRINTER_STATUSES)[number];

export const DEVICE_TYPES = ["interno", "externo"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export type PrinterResponse = {
  id: number;
  modelId: number;
  softwareId: number | null;
  clientId: number | null;
  fiscalSerial: string;
  finalSalePrice: number | null;
  createdAt: string;
  status: PrinterStatus | "inicializada" | "de_demostracion";
  distributorId: number | null;
  paid: boolean;
  installationDate: string | null;
  versionFirmware: string | null;
  macAddress: string | null;
  deviceType: DeviceType;
};

export type PrinterRequest = {
  modelId: number;
  softwareId?: number | null;
  clientId?: number | null;
  distributorId?: number | null;
  fiscalSerial: string;
  finalSalePrice?: number | null;
  paid: boolean;
  installationDate?: string | null;
  versionFirmware?: string | null;
  macAddress?: string | null;
  status: PrinterStatus;
  deviceType: DeviceType;
};
