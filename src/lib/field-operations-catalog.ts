import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { formatBranchShort } from "@/lib/branches";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type {
  DistributorResponse,
  ServiceCenterResponse,
} from "@/types/branch-role";
import type { PrinterResponse } from "@/types/printer";
import type { SealResponse } from "@/types/seal";
import type { UserResponse } from "@/types/user";

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

export function technicianUserSelectOptions(
  users: UserResponse[],
): SearchableSelectOption[] {
  return users
    .map((user) => {
      const cedula = user.nationalId?.trim();
      const label = cedula
        ? `${user.name} · ${cedula}`
        : user.name;
      return {
        value: String(user.id),
        label,
        searchText: `${user.name} ${user.email} ${cedula ?? ""}`,
      };
    })
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
        : "Empresa desconocida";
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
        : "Empresa desconocida";
      return { value: String(d.id), label, searchText: label };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}
