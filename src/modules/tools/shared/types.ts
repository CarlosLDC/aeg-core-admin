import type { PrinterStatus } from "@/types/printer";

export type ToolsPrinterPartySummary = {
  name: string;
  rif: string;
  phone: string;
  email: string;
};

/** @deprecated Use ToolsPrinterPartySummary */
export type ToolsPrinterClientSummary = ToolsPrinterPartySummary;

export type ToolsPrinter = {
  id: number;
  serial: string;
  macAddress: string | null;
  modelo: string;
  marca: string;
  estado: string;
  status: PrinterStatus;
  firmware: string;
  ubicacion: string;
  ciudad: string;
  rifCliente: string;
  rifName: string;
  distributorName: string;
  distributorRif: string;
  distributorSummary: ToolsPrinterPartySummary | null;
  reporteX: string | number;
  clientId: number | null;
  clientSummary: ToolsPrinterClientSummary | null;
};

export type ToolsPrinterLocationSource = {
  ubicacion?: string;
  provinceInstall?: string;
  stateInstall?: string;
  addressInstall?: string;
  branchState?: string | null;
  branchCity?: string | null;
  branchAddress?: string | null;
};
