import type { PrinterStatus } from "@/types/printer";

export type ToolsPrinterClientSummary = {
  name: string;
  phone: string;
  email: string;
};

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
  rifCliente: string;
  rifName: string;
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
