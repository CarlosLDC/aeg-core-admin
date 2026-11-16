import type { BranchResponse } from "@/types/branch";
import type {
  CommercialInvoiceCollectionStatus,
  CommercialInvoiceResponse,
} from "@/types/commercial-invoice";

export type BranchCommercialInvoiceQuickFilter =
  | "all"
  | "paid"
  | "pending"
  | "other";

export type BranchCommercialInvoiceStats = {
  total: number;
  paid: number;
  pending: number;
  other: number;
};

const PENDING_COLLECTION_STATUSES = new Set<CommercialInvoiceCollectionStatus>([
  "PAGO_PARCIAL",
  "DEBE_IVA",
  "PENDIENTE_PAGO",
  "POR_FACTURAR",
]);

/**
 * Filtra las facturas comerciales asociadas a la empresa fiscal de la sucursal.
 */
export function filterCommercialInvoicesForBranch(
  invoices: CommercialInvoiceResponse[],
  branch: Pick<BranchResponse, "companyId">,
): CommercialInvoiceResponse[] {
  return invoices.filter(
    (invoice) =>
      invoice.empresaId != null && invoice.empresaId === branch.companyId,
  );
}

/**
 * Calcula los totales de facturas comerciales por grupo de estado de cobro.
 */
export function getBranchCommercialInvoiceStats(
  invoices: CommercialInvoiceResponse[],
): BranchCommercialInvoiceStats {
  let paid = 0;
  let pending = 0;
  let other = 0;

  for (const invoice of invoices) {
    if (invoice.estadoCobro === "PAGADO") {
      paid += 1;
    } else if (PENDING_COLLECTION_STATUSES.has(invoice.estadoCobro)) {
      pending += 1;
    } else {
      other += 1;
    }
  }

  return {
    total: invoices.length,
    paid,
    pending,
    other,
  };
}

/**
 * Aplica el filtro rápido por grupo de estado de cobro.
 */
export function filterCommercialInvoicesByQuickFilter(
  invoices: CommercialInvoiceResponse[],
  quickFilter: BranchCommercialInvoiceQuickFilter,
): CommercialInvoiceResponse[] {
  if (quickFilter === "all") return invoices;
  if (quickFilter === "paid") {
    return invoices.filter((invoice) => invoice.estadoCobro === "PAGADO");
  }
  if (quickFilter === "pending") {
    return invoices.filter((invoice) =>
      PENDING_COLLECTION_STATUSES.has(invoice.estadoCobro),
    );
  }
  return invoices.filter(
    (invoice) =>
      invoice.estadoCobro !== "PAGADO" &&
      !PENDING_COLLECTION_STATUSES.has(invoice.estadoCobro),
  );
}
