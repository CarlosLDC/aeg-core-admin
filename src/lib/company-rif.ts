import { ApiError } from "@/types/auth";
import type { CompanyResponse } from "@/types/company";
import { createCompany, fetchCompanies } from "@/lib/companies-api";
import { findCompanyByRif, normalizeRif } from "@/lib/seniat-extract";
import type { CompanyRequest } from "@/types/company";

export function isDuplicateCompanyRifError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const msg = error.message.toLowerCase();
  return (
    error.status === 409 ||
    (error.status === 400 &&
      msg.includes("rif") &&
      (msg.includes("exist") || msg.includes("ya existe") || msg.includes("duplicate")))
  );
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

  const local = body.rif ? findCompanyByRif(companies, body.rif) : undefined;
  if (local) {
    return { companyId: local.id, companyCreated: false };
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

    const refreshed = await fetchCompanies();
    const existing = findCompanyByRif(refreshed, body.rif);
    if (!existing) {
      throw new Error(
        `El RIF ${normalizeRif(body.rif)} ya está registrado, pero no aparece en tu listado. Actualiza la página o contacta a un administrador.`,
      );
    }

    return {
      companyId: existing.id,
      companyCreated: false,
      companies: refreshed,
    };
  }
}
