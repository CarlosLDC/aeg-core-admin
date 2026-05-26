import type { BranchResponse } from "@/types/branch";
import type { EmployeeResponse } from "@/types/employee";

type EmployeeCompanyCandidate = Pick<EmployeeResponse, "companyId" | "branchId">;

export function resolveEmployeeCompanyId(
  employee: EmployeeCompanyCandidate,
  branches: BranchResponse[] = [],
): number | null {
  if (Number.isFinite(employee.companyId) && employee.companyId > 0) {
    return employee.companyId;
  }
  if (employee.branchId == null) return null;
  const branch = branches.find((row) => row.id === employee.branchId);
  return branch?.companyId ?? null;
}
