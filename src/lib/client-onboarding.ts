import { mergeBranchesWithRoles, syncBranchRoles } from "@/lib/branch-roles";
import { normalizeStateName } from "@/lib/state-label";
import {
  isDistributorClientOnlyRoles,
  linkDistributorClientToBranch,
  linkDistributorClientWithRetry,
} from "@/lib/client-link";
import {
  createBranch,
  fetchBranchById,
  lookupBranchByCompanyLocation,
} from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import { resolveCompanyIdForRif } from "@/lib/company-rif";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import type { BranchResponse, BranchWithRoles } from "@/types/branch";
import type { CompanyResponse, ContributorType } from "@/types/company";

export type ClientOnboardingValues = {
  rif: string;
  businessName: string;
  contributorType: ContributorType;
  linkedCompanyId: number | null;
  city: string;
  state: string;
  address: string;
  contactPersonName: string;
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
  resumeBranchId?: number | null;
  roles: ClientOnboardingRoleOptions;
};

export type CreateClientOnboardingResult = {
  branch: BranchResponse;
  companyId: number;
  companyCreated: boolean;
  /** Empresa ya existía (local o por RIF duplicado en API); solo se creó la sucursal/cliente */
  companyLinkedExisting: boolean;
  /** Sucursal reutilizada (misma empresa y ubicación) */
  branchLinkedExisting: boolean;
  companyLabel: string;
  branchLabel: string;
  /** Empresas refrescadas tras resolver RIF duplicado (para actualizar scope en UI) */
  refreshedCompanies?: CompanyResponse[];
  distributorId?: number | null;
  serviceCenterId?: number | null;
};

export async function fetchBranchRoleIds(branchId: number): Promise<{
  distributorId: number | null;
  serviceCenterId: number | null;
}> {
  const branch = await loadBranchWithRoles(branchId);
  return {
    distributorId: branch?.distributor?.id ?? null,
    serviceCenterId: branch?.serviceCenter?.id ?? null,
  };
}

async function loadBranchWithRoles(branchId: number): Promise<BranchWithRoles | null> {
  const [branch, distributorRows, clientRows, serviceCenterRows] = await Promise.all([
    fetchBranchById(branchId),
    fetchDistributors(),
    fetchClients(),
    fetchServiceCenters(),
  ]);
  const merged = mergeBranchesWithRoles(
    [branch],
    distributorRows,
    clientRows,
    serviceCenterRows,
  );
  return merged[0] ?? null;
}

/**
 * Alta de cliente (distribuidor o wizard admin con roles explícitos):
 *
 * 1. **Empresa nueva** (`companyCreated: true`): crea la empresa, crea la sucursal y
 *    asigna roles (`syncBranchRoles`, p. ej. cliente del `distributorId` indicado).
 * 2. **Empresa existente** (`companyLinkedExisting: true`): reutiliza el `companyId`
 *    (lista local, `/api/companies/resolve` o RIF duplicado en API), crea solo la
 *    sucursal y asigna los mismos roles en esa sucursal nueva.
 * 3. **Sucursal existente** (`branchLinkedExisting: true`): misma empresa y ciudad/estado;
 *    solo vincula el rol cliente (reintentos tras error parcial).
 */
export async function createClientOnboarding(
  input: CreateClientOnboardingInput,
): Promise<CreateClientOnboardingResult> {
  const { values, companies, resumeCompanyId, resumeBranchId, roles } = input;
  const branchLabel = `${values.city.trim()}, ${values.state.trim()}`;

  if (
    resumeBranchId != null &&
    resumeBranchId > 0 &&
    isDistributorClientOnlyRoles(roles)
  ) {
    await linkDistributorClientWithRetry(resumeBranchId, roles);
    const branch = await fetchBranchById(resumeBranchId);
    const roleIds = await fetchBranchRoleIds(resumeBranchId);
    const companyList = companies;
    return {
      branch,
      companyId: branch.companyId,
      companyCreated: false,
      companyLinkedExisting: true,
      branchLinkedExisting: true,
      companyLabel:
        companyList.find((c) => c.id === branch.companyId)?.businessName ??
        values.businessName,
      branchLabel,
      ...roleIds,
    };
  }

  const resolved = await resolveCompanyIdForRif(
    {
      rif: values.rif,
      businessName: values.businessName,
      contributorType: values.contributorType,
    },
    companies,
    {
      resumeCompanyId,
      linkedCompanyId: values.linkedCompanyId,
    },
  );

  const companyId = resolved.companyId;
  const companyCreated = resolved.companyCreated;
  const companyLinkedExisting = !companyCreated;
  const companyList = resolved.companies ?? companies;

  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new Error("No se pudo determinar la empresa para la sucursal.");
  }

  let branchLinkedExisting = false;
  let created: BranchResponse;

  if (resumeBranchId != null && resumeBranchId > 0) {
    created = await fetchBranchById(resumeBranchId);
    branchLinkedExisting = true;
  } else {
    const existing = await lookupBranchByCompanyLocation(
      companyId,
      values.city,
      values.state,
    );
    if (existing) {
      created = existing;
      branchLinkedExisting = true;
    } else {
      try {
        created = await createBranch({
          companyId,
          city: values.city.trim(),
          state: normalizeStateName(values.state),
          address: values.address.trim() || undefined,
          contactPersonName: values.contactPersonName.trim() || undefined,
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
    }
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
    if (isDistributorClientOnlyRoles(roles)) {
      await linkDistributorClientWithRetry(created.id, roles);
    } else {
      const previous = await loadBranchWithRoles(created.id);
      await syncBranchRoles(created.id, previous, roles);
    }
  } catch (roleError) {
    const err = new Error(
      roleError instanceof Error
        ? roleError.message
        : "No se pudieron asignar los roles.",
    ) as Error & { resumeCompanyId?: number; resumeBranchId?: number };
    if (companyId != null) err.resumeCompanyId = companyId;
    err.resumeBranchId = created.id;
    throw err;
  }

  const companyLabel =
    companyList.find((c) => c.id === companyId)?.businessName ??
    values.businessName;

  const roleIds = await fetchBranchRoleIds(created.id);

  return {
    branch: created,
    companyId,
    companyCreated,
    companyLinkedExisting,
    branchLinkedExisting,
    companyLabel,
    branchLabel,
    refreshedCompanies: resolved.companies,
    ...roleIds,
  };
}

/** Roles por defecto al registrar un cliente desde el panel del distribuidor. */
export function distributorClientRoles(
  distributorId: number,
): ClientOnboardingRoleOptions {
  return {
    isClient: true,
    isDistributor: false,
    isServiceCenter: false,
    clientDistributorId: String(distributorId),
  };
}
