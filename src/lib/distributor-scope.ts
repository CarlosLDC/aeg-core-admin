import type { DistributorResponse } from "@/types/branch-role";
import type { EmployeeResponse } from "@/types/employee";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse } from "@/types/printer";
import type { Role } from "@/types/user";

/** Sucursal(es) donde opera la distribuidora (personal propio), no sucursales de clientes. */
export function distributorStaffBranchIds(
  distributors: DistributorResponse[],
  distributorId: number | null,
): Set<number> {
  if (distributorId == null) return new Set();
  const row = distributors.find((d) => d.id === distributorId);
  if (!row) return new Set();
  return new Set([row.branchId]);
}

export function filterEmployeesForDistributorStaff(
  employees: EmployeeResponse[],
  role: Role,
  distributorStaffBranchIds: Set<number>,
): EmployeeResponse[] {
  if (role !== "DISTRIBUTOR") return employees;
  if (distributorStaffBranchIds.size === 0) return [];
  return employees.filter((e) => distributorStaffBranchIds.has(e.branchId));
}

/** Modelos referenciados por las impresoras del distribuidor (no el catálogo completo). */
export function filterPrinterModelsForDistributor(
  models: PrinterModelResponse[],
  printers: PrinterResponse[],
): PrinterModelResponse[] {
  const modelIds = new Set(printers.map((p) => p.modelId));
  return models.filter((m) => modelIds.has(m.id));
}
