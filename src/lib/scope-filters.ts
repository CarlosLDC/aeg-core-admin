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
import { isDistributorPanelRole, type Role, type UserResponse } from "@/types/user";

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
  if (isDistributorPanelRole(role) && distributorId != null) {
    return printers.filter((p) => p.distributorId === distributorId);
  }
  if (role === "SERVICE_CENTER") {
    return printers.filter(
      (p) => p.status === "asignada" && p.clientId != null,
    );
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
  if (role === "ADMIN" || isDistributorPanelRole(role) || role === "SERVICE_CENTER") {
    return printers;
  }
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
  if (isDistributorPanelRole(role) && distributorId != null) {
    return technicians.filter((user) => user.distributorId === distributorId);
  }
  if (role === "SERVICE_CENTER") return technicians;
  return technicians;
}

export function filterInspectorUsersInScope(
  users: UserResponse[],
  role: Role,
  distributorId: number | null,
  currentUserId: number | null,
): UserResponse[] {
  const inspectors = users.filter(
    (user) =>
      user.enabled &&
      (user.role === "DISTRIBUTOR" ||
        user.role === "TECHNICIAN" ||
        user.role === "SERVICE_CENTER"),
  );
  if (role === "ADMIN") return inspectors;
  if (currentUserId != null) {
    const self = inspectors.find((user) => user.id === currentUserId);
    if (self) return [self];
  }
  if (isDistributorPanelRole(role) && distributorId != null) {
    return inspectors.filter(
      (user) =>
        user.role === "SERVICE_CENTER" ||
        user.distributorId === distributorId,
    );
  }
  if (role === "SERVICE_CENTER" && currentUserId != null) {
    return inspectors.filter((user) => user.id === currentUserId);
  }
  return inspectors;
}

export function filterSealsByPrinterScope(
  seals: SealResponse[],
  printerIds: Set<number>,
  role: Role,
): SealResponse[] {
  if (role === "ADMIN") return seals;
  if (role === "SERVICE_CENTER") return [];
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
  if (isDistributorPanelRole(role) && distributorId != null) {
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
>(rows: T[], printerIds: Set<number>, inspectorUserIds: Set<number>, role: Role): T[] {
  if (role === "ADMIN") return rows;
  if (isDistributorPanelRole(role) || role === "SERVICE_CENTER") {
    return filterByPrinterIds(rows, printerIds, role);
  }
  return rows.filter(
    (row) =>
      printerIds.has(row.printerId) && inspectorUserIds.has(row.userId),
  );
}

export type ScopedFieldCatalogInput = {
  role: Role;
  scope: CompanyScope | null;
  distributorId: number | null;
  currentUserId: number | null;
  companies: CompanyResponse[];
  branches: BranchResponse[];
  clients: ClientResponse[];
  distributors: DistributorResponse[];
  serviceCenters: ServiceCenterResponse[];
  technicianUsers: UserResponse[];
  inspectorUsers: UserResponse[];
  printers: PrinterResponse[];
  seals: SealResponse[];
};

export function applyScopedFieldCatalog(input: ScopedFieldCatalogInput) {
  const {
    role,
    scope,
    distributorId,
    currentUserId,
    companies,
    branches,
    clients,
    distributors,
    serviceCenters,
    technicianUsers,
    inspectorUsers,
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
  const scopedInspectorUsers = filterInspectorUsersInScope(
    inspectorUsers,
    role,
    distributorId,
    currentUserId,
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
    inspectorUsers: scopedInspectorUsers,
    printers: scopedPrinters,
    printerIds: scopedPrinterIds,
    seals: scopedSeals,
  };
}
