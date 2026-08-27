import { normalizePrinterStatus } from "@/lib/printer-status";
import type { BranchWithRoles } from "@/types/branch";
import type { ClientResponse } from "@/types/branch-role";
import type { PrinterResponse } from "@/types/printer";

export type BranchPrinterQuickFilter = "all" | "asignada" | "enajenada" | "other";

export type BranchPrinterStats = {
  total: number;
  assigned: number;
  disposed: number;
  other: number;
};

/**
 * Filtra las impresoras que pertenecen a una empresa (sucursal), ya sea como cliente
 * o como distribuidora.
 */
export function filterPrintersForBranch(
  printers: PrinterResponse[],
  branch: Pick<BranchWithRoles, "id"> & {
    client?: Pick<ClientResponse, "id"> | null;
    distributor?: { id: number } | null;
  },
  client?: Pick<ClientResponse, "id" | "branchId"> | null,
  clients: Pick<ClientResponse, "id" | "branchId">[] = [],
): PrinterResponse[] {
  const clientIds = new Set<number>();
  if (branch.client?.id != null) {
    clientIds.add(branch.client.id);
  }
  if (client?.id != null && (client.branchId == null || client.branchId === branch.id)) {
    clientIds.add(client.id);
  }
  for (const c of clients) {
    if (c.branchId === branch.id) {
      clientIds.add(c.id);
    }
  }

  const distributorId = branch.distributor?.id ?? null;

  if (clientIds.size === 0 && distributorId == null) {
    return [];
  }

  return printers.filter((printer) => {
    const matchesClient =
      printer.clientId != null && clientIds.has(printer.clientId);
    const matchesDistributor =
      printer.distributorId != null && printer.distributorId === distributorId;

    return matchesClient || matchesDistributor;
  });
}

/**
 * Calcula estadísticas de las impresoras de una empresa (total, asignadas, enajenadas y otros).
 */
export function getBranchPrinterStats(
  printers: PrinterResponse[],
): BranchPrinterStats {
  let assigned = 0;
  let disposed = 0;

  for (const printer of printers) {
    const status = normalizePrinterStatus(printer.status);
    if (status === "asignada") {
      assigned += 1;
    } else if (status === "enajenada") {
      disposed += 1;
    }
  }

  return {
    total: printers.length,
    assigned,
    disposed,
    other: printers.length - assigned - disposed,
  };
}

/**
 * Filtra la lista de impresoras según el filtro rápido seleccionado.
 */
export function filterPrintersByQuickFilter(
  printers: PrinterResponse[],
  filter: BranchPrinterQuickFilter,
): PrinterResponse[] {
  if (filter === "all") return printers;
  if (filter === "asignada") {
    return printers.filter(
      (p) => normalizePrinterStatus(p.status) === "asignada",
    );
  }
  if (filter === "enajenada") {
    return printers.filter(
      (p) => normalizePrinterStatus(p.status) === "enajenada",
    );
  }
  if (filter === "other") {
    return printers.filter((p) => {
      const status = normalizePrinterStatus(p.status);
      return status !== "asignada" && status !== "enajenada";
    });
  }
  return printers;
}
