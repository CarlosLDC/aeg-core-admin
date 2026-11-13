export const PRINTER_STATUSES = [
  "sin_asignar",
  "asignada",
  "en_consignacion",
  "enajenada",
  "a_credito",
  "desincorporada",
  "laboratorio",
] as const;
export type PrinterStatus = (typeof PRINTER_STATUSES)[number];

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
  status: PrinterStatus | "de_fabrica" | "inicializada" | "de_demostracion";
  distributorId: number | null;
  paid: boolean;
  installationDate: string | null;
  firmwareId?: number | null;
  versionFirmware: string | null;
  /** true si se lanzó una actualización de firmware y la impresora no respondió al verificarla. */
  firmwareUpdateUnverified?: boolean;
  macAddress: string | null;
  header: PrinterTicketSection | null;
  trailer: PrinterTicketSection | null;
  /** El backend puede omitir header/trailer en listados; este flag indica si hay ticket configurado. */
  hasTicketConfig?: boolean;
  encryptionKey?: string | null;
  llaveEncrip?: string | null;
  enajenacionAutorizada?: boolean;
  enajenacionAutorizadaAt?: string | null;
  creditInstallments?: number | null;
  pendingEnajenacionRequestId?: number | null;
  creditPaidTotal?: number | null;
  creditPaymentCount?: number | null;
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

export type PrinterFirmwareQueryResponse = {
  versionFirmware: string;
  firmwareId: number | null;
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
  firmwareId?: number | null;
  versionFirmware?: string | null;
  macAddress?: string | null;
  status: PrinterStatus;
  creationBatchId?: string | null;
  encryptionKey?: string | null;
  llaveEncrip?: string | null;
  enajenacionAutorizada?: boolean;
  enajenacionAutorizadaAt?: string | null;
  creditInstallments?: number | null;
  pendingEnajenacionRequestId?: number | null;
  creditPaidTotal?: number | null;
  creditPaymentCount?: number | null;
};
