import type { CompanyScope } from "@/lib/company-scope";
import type {
  ClientResponse,
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { EmployeeResponse } from "@/types/employee";
import type { TechnicianResponse } from "@/types/employee-role";
import type { PrinterResponse } from "@/types/printer";
import type { SealResponse } from "@/types/seal";
import type { Role } from "@/types/user";
import { filterEmployeesForDistributorStaff } from "@/lib/distributor-scope";

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
  if (role === "DISTRIBUTOR" && distributorId != null) {
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
  if (role === "ADMIN" || role === "DISTRIBUTOR") return printers;
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

export function filterEmployeesInScope(
  employees: EmployeeResponse[],
  branchIds: Set<number>,
  role: Role,
  userBranchId: number | null,
  distributorStaffBranchIds?: Set<number>,
): EmployeeResponse[] {
  if (role === "DISTRIBUTOR") {
    return filterEmployeesForDistributorStaff(
      employees,
      role,
      distributorStaffBranchIds ?? new Set(),
    );
  }
  if (branchIds.size > 0) {
    return employees.filter((e) => branchIds.has(e.branchId));
  }
  if (userBranchId != null) {
    return employees.filter((e) => e.branchId === userBranchId);
  }
  if (role === "ADMIN") return employees;
  return [];
}

export function filterTechniciansInScope(
  technicians: TechnicianResponse[],
  employees: EmployeeResponse[],
): TechnicianResponse[] {
  const employeeIds = new Set(employees.map((e) => e.id));
  return technicians.filter((t) => employeeIds.has(t.employeeId));
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
  if (role === "DISTRIBUTOR" && distributorId != null) {
    scoped = scoped.filter(
      (row) =>
        row.distributorId === distributorId ||
        row.distributorId == null,
    );
  }
  return scoped;
}

export function filterAnnualInspectionsInScope<
  T extends { printerId: number; employeeId: number },
>(rows: T[], printerIds: Set<number>, employeeIds: Set<number>, role: Role): T[] {
  if (role === "ADMIN") return rows;
  return rows.filter(
    (row) =>
      printerIds.has(row.printerId) && employeeIds.has(row.employeeId),
  );
}

export type ScopedFieldCatalogInput = {
  role: Role;
  scope: CompanyScope | null;
  distributorId: number | null;
  userBranchId: number | null;
  companies: CompanyResponse[];
  branches: BranchResponse[];
  clients: ClientResponse[];
  distributors: DistributorResponse[];
  serviceCenters: ServiceCenterResponse[];
  employees: EmployeeResponse[];
  technicians: TechnicianResponse[];
  printers: PrinterResponse[];
  seals: SealResponse[];
};

export function applyScopedFieldCatalog(input: ScopedFieldCatalogInput) {
  const {
    role,
    scope,
    distributorId,
    userBranchId,
    companies,
    branches,
    clients,
    distributors,
    serviceCenters,
    employees,
    technicians,
    printers,
    seals,
  } = input;

  const branchIds = branchIdsFromScope(scope, branches);
  const staffBranchIds =
    role === "DISTRIBUTOR" && distributorId != null
      ? new Set(
          distributors
            .filter((d) => d.id === distributorId)
            .map((d) => d.branchId),
        )
      : undefined;
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
  const scopedEmployees = filterEmployeesInScope(
    employees,
    branchIds,
    role,
    userBranchId,
    staffBranchIds,
  );
  const scopedTechnicians = filterTechniciansInScope(
    technicians,
    scopedEmployees,
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
    employees: scopedEmployees,
    technicians: scopedTechnicians,
    printers: scopedPrinters,
    printerIds: scopedPrinterIds,
    seals: scopedSeals,
  };
}
