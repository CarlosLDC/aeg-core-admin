import type {
  CommercialInvoiceCollectionStatus,
  CommercialInvoiceModality,
} from "@/types/commercial-invoice";
import type { CommercialPaymentResponse } from "@/types/commercial-payment";
import type { PrinterStatus } from "@/types/printer";

export type PrinterCreditPaymentResponse = {
  id: number;
  printerId: number;
  amount: number;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  registeredById: number | null;
  registeredByName: string | null;
  createdAt: string;
};

export type PrinterCreditSummaryResponse = {
  printerId: number;
  fiscalSerial: string;
  status: PrinterStatus;
  finalSalePrice: number | null;
  creditInstallments: number | null;
  totalPaid: number;
  remainingBalance: number | null;
  paymentCount: number;
  paid: boolean;
  payments: PrinterCreditPaymentResponse[];
  facturaComercialId?: number | null;
  facturaComercialNumero?: string | null;
  facturaComercialModalidad?: CommercialInvoiceModality | null;
  facturaComercialEstadoCobro?: CommercialInvoiceCollectionStatus | null;
  facturaComercialPrinterCount?: number;
  commercialPayments?: CommercialPaymentResponse[];
};

export type PrinterCreditPlanRequest = {
  creditInstallments: number;
  finalSalePrice?: number | null;
};

export type PrinterCreditPaymentRequest = {
  amount: number;
  paymentDate: string;
  reference?: string | null;
  notes?: string | null;
  markAsPaid?: boolean;
};
