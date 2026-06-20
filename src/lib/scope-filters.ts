import type { CompanyScope } from "@/lib/company-scope";
import type {
  ClientResponse,
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";
import type { SealResponse } from "@/types/seal";
import type { Role, UserResponse } from "@/types/user";

export function branchIdsFromScope(
  scope: CompanyScope | null,
  branches: BranchResponse[],
): Set<number> {
  if (scope?.branches.length) {
    return new Set(scope.branches.map((b) => b.id));
  }
  return new Set(branches.map((b) => b.id));
}

export function filterByBranchScope<T extends { branchId: number }>(
  items: T[],
  branchIds: Set<number>,
  role: Role,
): T[] {
  if (role === "ADMIN") return items;
  if (branchIds.size === 0) return [];
  return items.filter((item) => branchIds.has(item.branchId));
}

export function filterPrintersForUser(
  printers: PrinterResponse[],
  role: Role,
  distributorId: number | null,
): PrinterResponse[] {
  if (role === "TECHNICIAN" && distributorId != null) {
    return printers.filter((p) => p.distributorId === distributorId);
  }
  return printers;
}

export function filterPrintersByBranchScope(
  printers: PrinterResponse[],
  branchIds: Set<number>,
  role: Role,
  clients: ClientResponse[],
  distributors: DistributorResponse[],
): PrinterResponse[] {
  if (role === "ADMIN" || role === "TECHNICIAN") return printers;
  if (branchIds.size === 0) return [];

  const clientById = new Map(clients.map((c) => [c.id, c]));
  const distributorById = new Map(distributors.map((d) => [d.id, d]));

  return printers.filter((printer) => {
    if (printer.clientId != null) {
      const client = clientById.get(printer.clientId);
      if (client && branchIds.has(client.branchId)) return true;
    }
    if (printer.distributorId != null) {
      const distributor = distributorById.get(printer.distributorId);
      if (distributor && branchIds.has(distributor.branchId)) return true;
    }
    return false;
  });
}

export function filterTechnicianUsersInScope(
  users: UserResponse[],
  role: Role,
  distributorId: number | null,
): UserResponse[] {
  const technicians = users.filter((user) => user.role === "TECHNICIAN");
  if (role === "ADMIN") return technicians;
  if (role === "TECHNICIAN" && distributorId != null) {
    return technicians.filter((user) => user.distributorId === distributorId);
  }
  return technicians;
}

export function filterSealsByPrinterScope(
  seals: SealResponse[],
  printerIds: Set<number>,
  role: Role,
): SealResponse[] {
  if (role === "ADMIN") return seals;
  if (printerIds.size === 0) {
    return seals.filter((s) => s.printerId == null);
  }
  return seals.filter(
    (s) => s.printerId != null && printerIds.has(s.printerId),
  );
}

export function filterByPrinterIds<T extends { printerId: number }>(
  items: T[],
  printerIds: Set<number>,
  role: Role,
): T[] {
  if (role === "ADMIN") return items;
  if (printerIds.size === 0) return [];
  return items.filter((item) => printerIds.has(item.printerId));
}

export function filterTechnicalServicesInScope<
  T extends { printerId: number; distributorId: number | null },
>(rows: T[], printerIds: Set<number>, role: Role, distributorId: number | null): T[] {
  let scoped = filterByPrinterIds(rows, printerIds, role);
  if (role === "TECHNICIAN" && distributorId != null) {
    scoped = scoped.filter(
      (row) =>
        row.distributorId === distributorId ||
        row.distributorId == null,
    );
  }
  return scoped;
}

export function filterAnnualInspectionsInScope<
  T extends { printerId: number; userId: number },
>(rows: T[], printerIds: Set<number>, technicianUserIds: Set<number>, role: Role): T[] {
  if (role === "ADMIN") return rows;
  if (role === "TECHNICIAN") {
    return filterByPrinterIds(rows, printerIds, role);
  }
  return rows.filter(
    (row) =>
      printerIds.has(row.printerId) && technicianUserIds.has(row.userId),
  );
}

export type ScopedFieldCatalogInput = {
  role: Role;
  scope: CompanyScope | null;
  distributorId: number | null;
  companies: CompanyResponse[];
  branches: BranchResponse[];
  clients: ClientResponse[];
  distributors: DistributorResponse[];
  serviceCenters: ServiceCenterResponse[];
  technicianUsers: UserResponse[];
  printers: PrinterResponse[];
  seals: SealResponse[];
};

export function applyScopedFieldCatalog(input: ScopedFieldCatalogInput) {
  const {
    role,
    scope,
    distributorId,
    companies,
    branches,
    clients,
    distributors,
    serviceCenters,
    technicianUsers,
    printers,
    seals,
  } = input;

  const branchIds = branchIdsFromScope(scope, branches);
  const scopedClients = filterByBranchScope(clients, branchIds, role);
  const scopedDistributors = filterByBranchScope(
    distributors,
    branchIds,
    role,
  );
  const scopedServiceCenters = filterByBranchScope(
    serviceCenters,
    branchIds,
    role,
  );
  const scopedTechnicianUsers = filterTechnicianUsersInScope(
    technicianUsers,
    role,
    distributorId,
  );

  let scopedPrinters = filterPrintersForUser(printers, role, distributorId);
  scopedPrinters = filterPrintersByBranchScope(
    scopedPrinters,
    branchIds,
    role,
    scopedClients,
    scopedDistributors,
  );

  const scopedPrinterIds = new Set(scopedPrinters.map((p) => p.id));
  const scopedSeals = filterSealsByPrinterScope(seals, scopedPrinterIds, role);

  return {
    companies,
    branches: scope?.branches.length
      ? branches.filter((b) => branchIds.has(b.id))
      : branches,
    clients: scopedClients,
    distributors: scopedDistributors,
    serviceCenters: scopedServiceCenters,
    technicianUsers: scopedTechnicianUsers,
    printers: scopedPrinters,
    printerIds: scopedPrinterIds,
    seals: scopedSeals,
  };
}
