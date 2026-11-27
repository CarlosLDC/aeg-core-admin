import { toCommercialInvoiceRequest } from "@/lib/commercial-invoice-form";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type {
  CommercialInvoiceFormValues,
  CommercialInvoiceResponse,
} from "@/types/commercial-invoice";
import type {
  PrinterEnajenacionAuthorizeRequest,
  PrinterResponse,
} from "@/types/printer";

export type AuthorizeEnajenacionInvoiceMode = "existing" | "new";

export type BuildAuthorizeEnajenacionInput = {
  creditInstallments: string;
  finalSalePrice: string;
  invoiceMode: AuthorizeEnajenacionInvoiceMode;
  selectedInvoiceId: string;
  newInvoice: CommercialInvoiceFormValues;
};

/**
 * Resuelve la empresa asociada al distribuidor asignado a la impresora.
 */
export function resolvePrinterDistributorCompanyId(
  printer: Pick<PrinterResponse, "distributorId"> | null | undefined,
  distributors: DistributorResponse[],
  branches: BranchResponse[],
): number | null {
  if (!printer?.distributorId) return null;
  const distributor = distributors.find((d) => d.id === printer.distributorId);
  if (!distributor) return null;
  const branch = branches.find((b) => b.id === distributor.branchId);
  return branch?.companyId ?? null;
}

/**
 * Ordena las facturas comerciales priorizando la factura actualmente vinculada a la impresora,
 * luego las facturas de la empresa preferida (distribuidor) más recientes y finalmente el resto.
 */
export function sortCommercialInvoicesForPrinter(
  invoices: CommercialInvoiceResponse[],
  printer: Pick<PrinterResponse, "facturaComercialId">,
  preferredEmpresaId: number | null,
): CommercialInvoiceResponse[] {
  const rank = (invoice: CommercialInvoiceResponse): number => {
    if (
      printer.facturaComercialId != null &&
      invoice.id === printer.facturaComercialId
    ) {
      return 0;
    }
    if (
      preferredEmpresaId != null &&
      invoice.empresaId === preferredEmpresaId
    ) {
      return 1;
    }
    return 2;
  };

  return [...invoices].sort((a, b) => {
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

export function emptyAuthorizeNewInvoiceForm(
  defaultEmpresaId?: number | null,
): CommercialInvoiceFormValues {
  return {
    numeroFactura: "",
    empresaId:
      defaultEmpresaId != null && defaultEmpresaId > 0
        ? String(defaultEmpresaId)
        : "",
    modalidad: "VENTA",
    estadoCobro: "PENDIENTE_PAGO",
    montoTotal: "",
  };
}

export function buildAuthorizeEnajenacionPayload(
  input: BuildAuthorizeEnajenacionInput,
): PrinterEnajenacionAuthorizeRequest | string {
  const parsedInstallments = Number(input.creditInstallments.trim());
  if (!Number.isInteger(parsedInstallments) || parsedInstallments < 1) {
    return "Debes indicar un número de cuotas válido (entero mayor o igual a 1).";
  }

  let parsedPrice: number | null = null;
  if (input.finalSalePrice.trim()) {
    const n = Number(input.finalSalePrice.trim());
    if (!Number.isFinite(n) || n < 0) {
      return "El monto total de venta no puede ser negativo.";
    }
    parsedPrice = n;
  }

  if (input.invoiceMode === "existing") {
    const parsedInvoiceId = Number(input.selectedInvoiceId.trim());
    if (
      !input.selectedInvoiceId.trim() ||
      !Number.isInteger(parsedInvoiceId) ||
      parsedInvoiceId <= 0
    ) {
      return "Debes seleccionar una orden existente o crear una nueva.";
    }
    return {
      creditInstallments: parsedInstallments,
      finalSalePrice: parsedPrice,
      facturaComercialId: parsedInvoiceId,
    };
  }

  const invoiceOrError = toCommercialInvoiceRequest(input.newInvoice);
  if (typeof invoiceOrError === "string") {
    return invoiceOrError;
  }

  return {
    creditInstallments: parsedInstallments,
    finalSalePrice: parsedPrice,
    newCommercialInvoice: invoiceOrError,
  };
}
