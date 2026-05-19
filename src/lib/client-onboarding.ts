import { syncBranchRoles } from "@/lib/branch-roles";
import { createBranch } from "@/lib/branches-api";
import { createCompany } from "@/lib/companies-api";
import { findCompanyByRif } from "@/lib/seniat-extract";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse, ContributorType } from "@/types/company";

export type ClientOnboardingValues = {
  rif: string;
  businessName: string;
  contributorType: ContributorType;
  linkedCompanyId: number | null;
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
};

export type ClientOnboardingRoleOptions = {
  isClient: boolean;
  isDistributor: boolean;
  isServiceCenter: boolean;
  clientDistributorId: string;
};

export type CreateClientOnboardingInput = {
  values: ClientOnboardingValues;
  companies: CompanyResponse[];
  resumeCompanyId?: number | null;
  roles: ClientOnboardingRoleOptions;
};

export type CreateClientOnboardingResult = {
  branch: BranchResponse;
  companyId: number;
  companyCreated: boolean;
  companyLabel: string;
  branchLabel: string;
};

/** Empresa (si aplica) + sucursal + roles — usado por wizard admin y alta de cliente distribuidor. */
export async function createClientOnboarding(
  input: CreateClientOnboardingInput,
): Promise<CreateClientOnboardingResult> {
  const { values, companies, resumeCompanyId, roles } = input;
  const branchLabel = `${values.city.trim()}, ${values.state.trim()}`;

  let companyCreated = false;
  let companyId: number | null = resumeCompanyId ?? values.linkedCompanyId ?? null;

  if (companyId == null) {
    const existing = values.rif
      ? findCompanyByRif(companies, values.rif)
      : undefined;
    if (existing) {
      companyId = existing.id;
    } else {
      const company = await createCompany({
        rif: values.rif,
        businessName: values.businessName,
        contributorType: values.contributorType,
      });
      if (!company?.id) {
        throw new Error(
          "El servidor no devolvió la empresa creada. Revisa el listado de empresas.",
        );
      }
      companyId = company.id;
      companyCreated = true;
    }
  }

  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new Error("No se pudo determinar la empresa para la sucursal.");
  }

  let created;
  try {
    created = await createBranch({
      companyId,
      city: values.city.trim(),
      state: values.state.trim(),
      address: values.address.trim() || undefined,
      phone: values.phone.trim() || undefined,
      email: values.email.trim() || undefined,
    });
  } catch (branchError) {
    if (companyCreated && companyId != null) {
      const err = new Error(
        branchError instanceof Error
          ? branchError.message
          : "No se pudo crear la sucursal.",
      ) as Error & { resumeCompanyId?: number };
      err.resumeCompanyId = companyId;
      throw err;
    }
    throw branchError;
  }

  if (!created?.id) {
    if (companyCreated && companyId != null) {
      const err = new Error(
        "El servidor no devolvió la sucursal creada. Revisa el listado o intenta de nuevo.",
      ) as Error & { resumeCompanyId?: number };
      err.resumeCompanyId = companyId;
      throw err;
    }
    throw new Error(
      "El servidor no devolvió la sucursal creada. Revisa el listado o intenta de nuevo.",
    );
  }

  try {
    await syncBranchRoles(created.id, null, roles);
  } catch (roleError) {
    if (companyCreated && companyId != null) {
      const err = new Error(
        roleError instanceof Error
          ? roleError.message
          : "No se pudieron asignar los roles.",
      ) as Error & { resumeCompanyId?: number };
      err.resumeCompanyId = companyId;
      throw err;
    }
    throw roleError;
  }

  const companyLabel =
    companies.find((c) => c.id === companyId)?.businessName ??
    values.businessName;

  return {
    branch: created,
    companyId,
    companyCreated,
    companyLabel,
    branchLabel,
  };
}

/** Roles por defecto al registrar un cliente desde el panel del distribuidor. */
export function distributorClientRoles(distributorId: number): ClientOnboardingRoleOptions {
  return {
    isClient: true,
    isDistributor: false,
    isServiceCenter: false,
    clientDistributorId: String(distributorId),
  };
}
