export const PRINTER_STATUSES = [
  "de_fabrica",
  "sin_asignar",
  "asignada",
  "en_consignacion",
  "enajenada",
  "desincorporada",
  "laboratorio",
] as const;
export type PrinterStatus = (typeof PRINTER_STATUSES)[number];

export const DEVICE_TYPES = ["interno", "externo"] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export type PrinterTicketSection = {
  lines: string[];
};

export type PrinterResponse = {
  id: number;
  modelId: number;
  softwareId: number | null;
  clientId: number | null;
  fiscalSerial: string;
  finalSalePrice: number | null;
  createdAt: string;
  creationBatchId?: string | null;
  status: PrinterStatus | "inicializada" | "de_demostracion";
  distributorId: number | null;
  paid: boolean;
  installationDate: string | null;
  versionFirmware: string | null;
  macAddress: string | null;
  deviceType: DeviceType;
  header: PrinterTicketSection | null;
  trailer: PrinterTicketSection | null;
  encryptionKey?: string | null;
  llaveEncrip?: string | null;
};

export type PrinterDispositionRequest = {
  clientId: number;
  installationDate?: string | null;
  header: PrinterTicketSection;
  trailer: PrinterTicketSection;
};

export type PrinterEnajenacionTicketResponse = {
  header: PrinterTicketSection;
  trailer: PrinterTicketSection;
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
  creationBatchId?: string | null;
  encryptionKey?: string | null;
  llaveEncrip?: string | null;
};
