import { ApiError } from "@/types/auth";
import {
  createClient,
  fetchClientByBranchId,
  updateClient,
} from "@/lib/clients-api";
import { DISTRIBUTOR_SELF_CLIENT_MESSAGE } from "@/lib/distributor-scope";
import { fetchDistributorById } from "@/lib/distributors-api";
import type { ClientOnboardingRoleOptions } from "@/lib/client-onboarding";

function parseDistributorId(roles: ClientOnboardingRoleOptions): number {
  const id = Number(roles.clientDistributorId?.trim());
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(
      "Tu usuario no tiene una distribuidora vinculada para registrar el cliente.",
    );
  }
  return id;
}

function isRecoverableLinkError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  if (error.status === 409 || error.status === 422) {
    return true;
  }
  if (error.status === 400) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("binding property") ||
      msg.includes("completar el vínculo") ||
      msg.includes("conflicto de datos") ||
      msg.includes("registro duplicado") ||
      msg.includes("sucursal ya está registrada") ||
      msg.includes("ya está registrado")
    );
  }
  return false;
}

async function linkViaPost(body: {
  branchId: number;
  distributorId: number;
}): Promise<void> {
  const existing = await fetchClientByBranchId(body.branchId);
  if (existing?.distributorId === body.distributorId) {
    return;
  }
  if (
    existing?.distributorId != null &&
    existing.distributorId !== body.distributorId
  ) {
    throw new Error("Esta sucursal ya es cliente de otra distribuidora.");
  }

  try {
    await createClient(body);
  } catch (error) {
    if (!isRecoverableLinkError(error)) {
      throw error;
    }
    const after = await fetchClientByBranchId(body.branchId);
    if (after?.distributorId === body.distributorId) {
      return;
    }
    if (
      after?.distributorId != null &&
      after.distributorId !== body.distributorId
    ) {
      throw new Error("Esta sucursal ya es cliente de otra distribuidora.");
    }
    if (after?.id != null) {
      await updateClient(after.id, body);
      return;
    }
    await createClient(body);
  }
}

/** Reintenta el vínculo tras errores transitorios de persistencia en el API. */
export async function linkDistributorClientWithRetry(
  branchId: number,
  roles: ClientOnboardingRoleOptions,
  maxAttempts = 3,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await linkDistributorClientToBranch(branchId, roles);
      return;
    } catch (error) {
      lastError = error;
      if (!isRecoverableLinkError(error) || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }
  throw lastError;
}

/** Vincula sucursal como cliente del distribuidor (POST idempotente; sin catálogos completos). */
async function assertNotDistributorSelfClientBranch(
  branchId: number,
  distributorId: number,
): Promise<void> {
  const distributor = await fetchDistributorById(distributorId);
  if (distributor.branchId === branchId) {
    throw new Error(DISTRIBUTOR_SELF_CLIENT_MESSAGE);
  }
}

export async function linkDistributorClientToBranch(
  branchId: number,
  roles: ClientOnboardingRoleOptions,
): Promise<void> {
  if (!roles.isClient) return;

  const distributorId = parseDistributorId(roles);
  await assertNotDistributorSelfClientBranch(branchId, distributorId);
  await linkViaPost({ branchId, distributorId });
}

export function isDistributorClientOnlyRoles(
  roles: ClientOnboardingRoleOptions,
): boolean {
  return (
    roles.isClient &&
    !roles.isDistributor &&
    !roles.isServiceCenter &&
    Boolean(roles.clientDistributorId?.trim())
  );
}
