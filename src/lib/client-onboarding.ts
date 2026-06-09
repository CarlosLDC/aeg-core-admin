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
  updateBranch,
} from "@/lib/branches-api";
import { fetchClientByBranchId, fetchClients } from "@/lib/clients-api";
import { CLIENT_RE_REGISTRATION_FORBIDDEN_MESSAGE } from "@/lib/distributor-scope";
import { ApiError } from "@/types/auth";
import { updateCompany } from "@/lib/companies-api";
import { resolveCompanyIdForRif } from "@/lib/company-rif";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import type { BranchRequest, BranchResponse, BranchWithRoles } from "@/types/branch";
import type { CompanyResponse, ContributorType } from "@/types/company";

function toOnboardingBranchRequest(
  companyId: number,
  values: ClientOnboardingValues,
): BranchRequest {
  return {
    companyId,
    city: values.city.trim(),
    state: normalizeStateName(values.state),
    address: values.address.trim() || undefined,
    contactPersonName: values.contactPersonName.trim() || undefined,
    phone: values.phone.trim() || undefined,
    email: values.email.trim() || undefined,
  };
}

/** Actualiza empresa/sucursal reutilizadas con los datos del formulario de alta. */
async function syncExistingCatalogFromOnboarding(
  companyId: number,
  branchId: number,
  values: ClientOnboardingValues,
  options: { syncCompany: boolean },
): Promise<BranchResponse> {
  if (options.syncCompany) {
    await updateCompany(companyId, {
      rif: values.rif.trim(),
      businessName: values.businessName.trim(),
      contributorType: values.contributorType,
    });
  }
  return updateBranch(branchId, toOnboardingBranchRequest(companyId, values));
}

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

function isDuplicateBranchError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 409 || error.status === 422) return true;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("sucursal ya está registrada") ||
    msg.includes("registro duplicado") ||
    msg.includes("ya existe")
  );
}

async function createOnboardingBranch(
  companyId: number,
  values: ClientOnboardingValues,
): Promise<BranchResponse> {
  return createBranch({
    companyId,
    city: values.city.trim(),
    state: normalizeStateName(values.state),
    address: values.address.trim() || undefined,
    contactPersonName: values.contactPersonName.trim() || undefined,
    phone: values.phone.trim() || undefined,
    email: values.email.trim() || undefined,
  });
}

/** Impide re-vincular una sucursal huérfana tras eliminación aprobada del cliente. */
async function assertDistributorMayReuseBranch(
  branchId: number,
): Promise<void> {
  const linked = await fetchClientByBranchId(branchId);
  if (!linked) {
    throw new Error(CLIENT_RE_REGISTRATION_FORBIDDEN_MESSAGE);
  }
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
  const distributorOnly = isDistributorClientOnlyRoles(roles);
  const canUpdateCatalog = !distributorOnly;
  if (
    resumeBranchId != null &&
    resumeBranchId > 0 &&
    distributorOnly
  ) {
    const existingBranch = await fetchBranchById(resumeBranchId);
    let branch = existingBranch;
    if (canUpdateCatalog) {
      branch = await syncExistingCatalogFromOnboarding(
        existingBranch.companyId,
        resumeBranchId,
        values,
        { syncCompany: true },
      );
    }
    await linkDistributorClientWithRetry(resumeBranchId, roles);
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
  } else if (distributorOnly) {
    try {
      created = await createOnboardingBranch(companyId, values);
    } catch (branchError) {
      if (companyLinkedExisting && isDuplicateBranchError(branchError)) {
        const existing = await lookupBranchByCompanyLocation(
          companyId,
          values.city,
          values.state,
        );
        if (existing) {
          await assertDistributorMayReuseBranch(existing.id);
          created = existing;
          branchLinkedExisting = true;
        } else {
          throw branchError;
        }
      } else if (companyCreated && companyId != null) {
        const err = new Error(
          branchError instanceof Error
            ? branchError.message
            : "No se pudo crear la sucursal.",
        ) as Error & { resumeCompanyId?: number };
        err.resumeCompanyId = companyId;
        throw err;
      } else {
        throw branchError;
      }
    }
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
        created = await createOnboardingBranch(companyId, values);
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

  if (canUpdateCatalog && (companyLinkedExisting || branchLinkedExisting)) {
    created = await syncExistingCatalogFromOnboarding(
      companyId,
      created.id,
      values,
      { syncCompany: companyLinkedExisting },
    );
  }

  if (distributorOnly && branchLinkedExisting) {
    await assertDistributorMayReuseBranch(created.id);
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
