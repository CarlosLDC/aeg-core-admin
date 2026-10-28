export type PrinterMqttLogItem = {
  id: number;
  recordedAt: string;
  printerId: number | null;
  mac: string;
  topic: string;
  payload: string;
};

export type PrinterLogsResponse = {
  printerId: number | null;
  mac: string | null;
  total: number;
  page: number;
  limit: number;
  logs: PrinterMqttLogItem[];
};

export type PrinterLogsFilterParams = {
  from?: string; // ISO string
  to?: string; // ISO string
  q?: string;
  page?: number;
  limit?: number;
  order?: "asc" | "desc";
};

export type DeletePrinterLogsParams = {
  before?: string; // ISO string
  from?: string; // ISO string
  to?: string; // ISO string
};

export type DeletePrinterLogsResponse = {
  deletedCount: number;
  message: string;
};
