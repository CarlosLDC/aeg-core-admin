import { fetchBranchById } from "@/lib/branches-api";
import { fetchDistributorById } from "@/lib/distributors-api";
import type { BranchResponse } from "@/types/branch";
import type { DistributorResponse } from "@/types/branch-role";
import type { EmployeeResponse } from "@/types/employee";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse } from "@/types/printer";
import type { Role } from "@/types/user";

/** Sucursal de la distribuidora (personal interno), no sucursales de clientes. */
export async function loadDistributorStaffBranches(
  distributorId: number,
): Promise<BranchResponse[]> {
  const distributor = await fetchDistributorById(distributorId);
  const branch = await fetchBranchById(distributor.branchId);
  return [branch];
}

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
  return employees.filter(
    (e) => e.branchId != null && distributorStaffBranchIds.has(e.branchId),
  );
}

/** Modelos referenciados por las impresoras del distribuidor (no el catálogo completo). */
export function filterPrinterModelsForDistributor(
  models: PrinterModelResponse[],
  printers: PrinterResponse[],
): PrinterModelResponse[] {
  const modelIds = new Set(printers.map((p) => p.modelId));
  return models.filter((m) => modelIds.has(m.id));
}
