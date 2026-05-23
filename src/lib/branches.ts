import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";

export function companyNameById(
  companies: CompanyResponse[],
  companyId: number,
): string {
  const company = companies.find((c) => c.id === companyId);
  return company?.businessName?.trim() || "Empresa desconocida";
}

/** Texto para búsqueda: razón social y RIF de la empresa */
export function companySearchTextById(
  companies: CompanyResponse[],
  companyId: number,
): string {
  const company = companies.find((c) => c.id === companyId);
  if (!company) return "Empresa desconocida";
  return [company.businessName, company.rif].filter(Boolean).join(" ");
}

export function formatBranchLabel(
  branch: BranchResponse,
  companies: CompanyResponse[] = [],
): string {
  const company = companyNameById(companies, branch.companyId);
  const location = [branch.city, branch.state].filter(Boolean).join(", ");
  const base = location ? `${company} · ${location}` : company;
  return branch.address ? `${base} — ${branch.address}` : base;
}

export function formatBranchShort(
  branch: BranchResponse,
  companies: CompanyResponse[] = [],
): string {
  const company = companyNameById(companies, branch.companyId);
  const location = [branch.city, branch.state].filter(Boolean).join(", ");
  return location ? `${company} · ${location}` : company;
}

export function branchLabelById(
  branches: BranchResponse[],
  companies: CompanyResponse[],
  branchId: number | null | undefined,
): string {
  if (branchId == null) return "—";
  const branch = branches.find((b) => b.id === branchId);
  if (!branch) return "Sucursal desconocida";
  return formatBranchShort(branch, companies);
}
