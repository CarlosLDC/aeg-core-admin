import { formatBranchShort } from "@/lib/branches";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { EmployeeResponse } from "@/types/employee";
import type { TechnicianResponse } from "@/types/employee-role";
import type {
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";
import type { PrinterResponse } from "@/types/printer";
import type { SealResponse } from "@/types/seal";

export function printerSelectOptions(
  printers: PrinterResponse[],
): SearchableSelectOption[] {
  return printers
    .map((p) => ({
      value: String(p.id),
      label: p.fiscalSerial,
      searchText: p.fiscalSerial,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function sealSelectOptions(seals: SealResponse[]): SearchableSelectOption[] {
  return seals
    .map((s) => ({
      value: String(s.id),
      label: s.serial,
      searchText: s.serial,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function technicianSelectOptions(
  technicians: TechnicianResponse[],
  employees: EmployeeResponse[],
): SearchableSelectOption[] {
  const empById = new Map(employees.map((e) => [e.id, e]));
  return technicians
    .map((t) => {
      const emp = empById.get(t.employeeId);
      const name = emp
        ? `${emp.name} · ${emp.nationalId}`
        : "Empleado desconocido";
      return {
        value: String(t.id),
        label: name,
        searchText: name,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function employeeSelectOptions(
  employees: EmployeeResponse[],
): SearchableSelectOption[] {
  return employees
    .map((e) => ({
      value: String(e.id),
      label: `${e.name} · ${e.nationalId}`,
      searchText: `${e.name} ${e.nationalId} ${e.email}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function serviceCenterSelectOptions(
  centers: ServiceCenterResponse[],
  branches: BranchResponse[],
  companies: CompanyResponse[],
): SearchableSelectOption[] {
  return centers
    .map((sc) => {
      const branch = branches.find((b) => b.id === sc.branchId);
      const label = branch
        ? formatBranchShort(branch, companies)
        : "Sucursal desconocida";
      return { value: String(sc.id), label, searchText: label };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function distributorSelectOptions(
  distributors: DistributorResponse[],
  branches: BranchResponse[],
  companies: CompanyResponse[],
): SearchableSelectOption[] {
  return distributors
    .map((d) => {
      const branch = branches.find((b) => b.id === d.branchId);
      const label = branch
        ? formatBranchShort(branch, companies)
        : "Sucursal desconocida";
      return { value: String(d.id), label, searchText: label };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}
