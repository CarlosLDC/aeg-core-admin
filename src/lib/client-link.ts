import { getCatalogErrorMessage } from "@/lib/api-error-message";
import {
  createClient,
  fetchClientByBranchId,
  updateClient,
} from "@/lib/clients-api";
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
  const msg = getCatalogErrorMessage(error).toLowerCase();
  return (
    msg.includes("binding property") ||
    msg.includes("completar el vínculo") ||
    msg.includes("sucursal ya está registrada") ||
    msg.includes("ya está registrado")
  );
}

/** Vincula sucursal como cliente del distribuidor (sin cargar catálogos completos). */
export async function linkDistributorClientToBranch(
  branchId: number,
  roles: ClientOnboardingRoleOptions,
): Promise<void> {
  if (!roles.isClient) return;

  const distributorId = parseDistributorId(roles);
  const body = { branchId, distributorId };

  const existing = await fetchClientByBranchId(branchId);
  if (existing) {
    if (
      existing.distributorId != null &&
      existing.distributorId !== distributorId
    ) {
      throw new Error("Esta sucursal ya es cliente de otra distribuidora.");
    }
    if (existing.distributorId === distributorId) {
      return;
    }
    await updateClient(existing.id, body);
    return;
  }

  try {
    await createClient(body);
  } catch (error) {
    if (!isRecoverableLinkError(error)) {
      throw error;
    }
    const after = await fetchClientByBranchId(branchId);
    if (after) {
      if (
        after.distributorId != null &&
        after.distributorId !== distributorId
      ) {
        throw new Error("Esta sucursal ya es cliente de otra distribuidora.");
      }
      if (after.distributorId !== distributorId) {
        await updateClient(after.id, body);
      }
      return;
    }
    await createClient(body);
  }
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
