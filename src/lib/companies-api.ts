import { apiFetch } from "@/lib/api";
import { getCatalogErrorMessage } from "@/lib/api-error-message";
import { getCatalogForbiddenMessage } from "@/lib/api-permissions";
import { ApiError } from "@/types/auth";
import type { CompanyRequest, CompanyResponse } from "@/types/company";

const BASE = "/api/companies";

export async function fetchCompanies(): Promise<CompanyResponse[]> {
  return apiFetch<CompanyResponse[]>(BASE);
}

export async function fetchCompanyById(id: number): Promise<CompanyResponse> {
  return apiFetch<CompanyResponse>(`${BASE}/${id}`);
}

export async function createCompany(
  body: CompanyRequest,
): Promise<CompanyResponse> {
  return apiFetch<CompanyResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCompany(
  id: number,
  body: CompanyRequest,
): Promise<CompanyResponse> {
  return apiFetch<CompanyResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteCompany(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getCompaniesErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return getCatalogForbiddenMessage("MODIFY");
    }
    if (error.status === 404) {
      return "Empresa no encontrada.";
    }
    return error.message;
  }
  return getCatalogErrorMessage(error);
}
