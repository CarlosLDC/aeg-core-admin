import { ApiError } from "@/types/auth";
import type { CompanyResponse } from "@/types/company";
import {
  createCompany,
  fetchCompanies,
  resolveCompanyByRif,
} from "@/lib/companies-api";
import { findCompanyByRif, normalizeRif } from "@/lib/seniat-extract";
import type { CompanyRequest } from "@/types/company";

export function isDuplicateCompanyRifError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 409 || error.status === 422) return true;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("already exist") ||
    msg.includes("ya existe") ||
    msg.includes("duplicate") ||
    (msg.includes("rif") && msg.includes("exist"))
  );
}

function findCompanyInCatalog(
  companies: CompanyResponse[],
  rif: string,
): CompanyResponse | undefined {
  return findCompanyByRif(companies, rif);
}

function mergeCompanyIntoCatalog(
  catalog: CompanyResponse[],
  company: CompanyResponse,
): CompanyResponse[] {
  if (catalog.some((c) => c.id === company.id)) return catalog;
  return [...catalog, company];
}

async function refreshAndFindByRif(
  rif: string,
  initial: CompanyResponse[],
): Promise<{ company?: CompanyResponse; companies: CompanyResponse[] }> {
  const inInitial = findCompanyInCatalog(initial, rif);
  if (inInitial) {
    return { company: inInitial, companies: initial };
  }

  const refreshed = await fetchCompanies();
  const foundInList = findCompanyInCatalog(refreshed, rif);
  if (foundInList) {
    return { company: foundInList, companies: refreshed };
  }

  const resolved = await resolveCompanyByRif(rif);
  if (resolved) {
    return {
      company: resolved,
      companies: mergeCompanyIntoCatalog(refreshed, resolved),
    };
  }

  return { company: undefined, companies: refreshed };
}

export type ResolveCompanyByRifResult = {
  companyId: number;
  companyCreated: boolean;
  /** Lista actualizada si hubo que refrescar tras RIF duplicado en API */
  companies?: CompanyResponse[];
};

/**
 * Obtiene el id de empresa para un RIF: lista local, creación, o reutilización si el API indica duplicado.
 */
export async function resolveCompanyIdForRif(
  body: CompanyRequest,
  companies: CompanyResponse[],
  options?: { resumeCompanyId?: number | null; linkedCompanyId?: number | null },
): Promise<ResolveCompanyByRifResult> {
  const preset = options?.resumeCompanyId ?? options?.linkedCompanyId ?? null;
  if (preset != null && preset > 0) {
    return { companyId: preset, companyCreated: false };
  }

  if (body.rif?.trim()) {
    const { company: existing, companies: catalog } = await refreshAndFindByRif(
      body.rif,
      companies,
    );
    if (existing) {
      return {
        companyId: existing.id,
        companyCreated: false,
        companies: catalog !== companies ? catalog : undefined,
      };
    }
  }

  try {
    const created = await createCompany(body);
    if (!created?.id) {
      throw new Error(
        "El servidor no devolvió la empresa creada. Revisa el listado de empresas.",
      );
    }
    return { companyId: created.id, companyCreated: true };
  } catch (error) {
    if (!isDuplicateCompanyRifError(error) || !body.rif?.trim()) {
      throw error;
    }

    const { company: existing, companies: refreshed } = await refreshAndFindByRif(
      body.rif,
      companies,
    );
    if (!existing) {
      throw new Error(
        `El RIF ${normalizeRif(body.rif)} ya está registrado en el sistema, pero no está en tu listado. Actualiza la página o contacta a un administrador.`,
      );
    }

    return {
      companyId: existing.id,
      companyCreated: false,
      companies: refreshed,
    };
  }
}
