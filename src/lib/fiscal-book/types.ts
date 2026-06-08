import type { PrinterStatus } from "@/types/printer";

export type EstatusPrecinto = "disponible" | "en_impresora" | "sustituido";

export type Precinto = {
  id: string;
  printerId: number | null;
  serial: string;
  color: string;
  status: EstatusPrecinto;
  createdAt: string;
  installationDate: string | null;
  removalDate: string | null;
};

export type FiscalSoftware = {
  id: number;
  name: string;
  version: string;
  createdAt: string;
};

export type FiscalEmpresa = {
  id: number;
  businessName: string;
  rif: string;
  contributorType: string;
};

export type FiscalSucursal = {
  id: number;
  companyId: number;
  city: string;
  state: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  company: FiscalEmpresa;
};

export type TechnicalReview = {
  id: string;
  createdAt: string | null;
  fechaSolicitud: string | null;
  serviceCenter: string | null;
  centerRif: string | null;
  technician: string | null;
  technicianId: string | null;
  startDate: string | null;
  endDate: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  zReportStart: string | null;
  zReportTimestampStart: string | null;
  zReportEnd: string | null;
  zReportTimestampEnd: string | null;
  sealBroken: boolean;
  sealReplaced: boolean;
  currentSealSerial: string | null;
  newSealSerial: string | null;
  description: string | null;
  observaciones: string | null;
  costo: number | null;
  photoUrls: string[];
};

export type FiscalAnnualInspection = {
  id: string;
  createdAt: string | null;
  date: string | null;
  serviceCenter: string | null;
  centerRif: string | null;
  inspector: string | null;
  observations: string | null;
  status: "passed" | "pending";
};

export type FiscalPrinterModel = {
  id: number;
  brand: string;
  modelCode: string;
  providencia: string | null;
  approvalDate: string | null;
  price: number;
};

export type FiscalDistribuidora = {
  id: number;
  branch: FiscalSucursal | null;
};

export type FiscalPrinter = {
  id: string;
  modelId: number;
  branchId: number | null;
  distributorId: number | null;
  fiscalSerial: string;
  status: PrinterStatus | string;
  finalSalePrice: number | null;
  paid: boolean | null;
  deviceType: string;
  versionFirmware: string | null;
  createdAt: string | null;
  installationDate: string | null;
  macAddress: string | null;
  businessName: string | null;
  rif: string | null;
  taxpayerType: string | null;
  address: string | null;
  model: FiscalPrinterModel | null;
  software: FiscalSoftware | null;
  branch: FiscalSucursal | null;
  distributor: FiscalDistribuidora | null;
  seals: Precinto[];
  technicalReviews: TechnicalReview[];
  annualInspections: FiscalAnnualInspection[];
};

export type FiscalBookSearchType = "serial" | "rif";

export type FiscalBookSearchResult = {
  data: FiscalPrinter[];
  count: number;
};
