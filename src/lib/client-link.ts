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
    msg.includes("conflicto de datos") ||
    msg.includes("registro duplicado") ||
    msg.includes("sucursal ya está registrada") ||
    msg.includes("ya está registrado")
  );
}

// #region agent log
function debugClientLink(
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
) {
  fetch("http://127.0.0.1:7781/ingest/0c54bab8-f62a-45dc-8c96-475b3dbd518d", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "f91276",
    },
    body: JSON.stringify({
      sessionId: "f91276",
      location: "client-link.ts",
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

async function linkViaPost(body: {
  branchId: number;
  distributorId: number;
}): Promise<void> {
  const existing = await fetchClientByBranchId(body.branchId);
  // #region agent log
  debugClientLink("linkViaPost:existing", { body, existing }, "H1");
  // #endregion
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
    const created = await createClient(body);
    // #region agent log
    debugClientLink("linkViaPost:create:ok", { body, created }, "H2");
    // #endregion
  } catch (error) {
    // #region agent log
    debugClientLink(
      "linkViaPost:create:error",
      { body, message: getCatalogErrorMessage(error) },
      "H2",
    );
    // #endregion
    if (!isRecoverableLinkError(error)) {
      throw error;
    }
    const after = await fetchClientByBranchId(body.branchId);
    // #region agent log
    debugClientLink("linkViaPost:afterRecoverable", { body, after }, "H3");
    // #endregion
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
export async function linkDistributorClientToBranch(
  branchId: number,
  roles: ClientOnboardingRoleOptions,
): Promise<void> {
  if (!roles.isClient) return;

  const distributorId = parseDistributorId(roles);
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
