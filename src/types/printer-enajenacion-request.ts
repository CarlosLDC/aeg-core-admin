import type {
  ModificationActionType,
  ModificationRequestStatus,
} from "@/types/client-modification-request";
import type { PrinterStatus } from "@/types/printer";

export type PrinterEnajenacionCreateRequest = {
  printerId: number;
  suggestedInstallments?: number | null;
  notes?: string | null;
};

export type PrinterEnajenacionApproveRequest = {
  creditInstallments: number;
  finalSalePrice?: number | null;
  reviewNote?: string | null;
};

export type PrinterEnajenacionRejectRequest = {
  reason?: string | null;
};

export type PrinterEnajenacionRequestListItemResponse = {
  id: number;
  printerId: number;
  fiscalSerial: string;
  distributorName: string;
  printerStatus: PrinterStatus | null;
  suggestedInstallments: number | null;
  notes: string | null;
  actionType: ModificationActionType;
  status: ModificationRequestStatus;
  requestedById: number | null;
  requestedByName: string;
  createdAt: string;
};

export type PrinterEnajenacionRequestDetailResponse = {
  id: number;
  printerId: number;
  fiscalSerial: string;
  modelCode: string;
  distributorId: number | null;
  distributorName: string;
  printerStatus: PrinterStatus | null;
  finalSalePrice: number | null;
  currentCreditInstallments: number | null;
  enajenacionAutorizada: boolean | null;
  suggestedInstallments: number | null;
  notes: string | null;
  approvedInstallments: number | null;
  reviewNote: string | null;
  actionType: ModificationActionType;
  status: ModificationRequestStatus;
  requestedById: number | null;
  requestedByName: string;
  createdAt: string;
};
