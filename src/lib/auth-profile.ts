import {
  clearStoredProfile,
  getStoredProfile,
  setStoredProfile,
} from "@/lib/auth-profile-storage";
import {
  getBranchIdFromToken,
  getDistributorIdFromToken,
  getRoleFromToken,
  getUsernameFromToken,
} from "@/lib/jwt";
import { fetchAuthMe } from "@/lib/auth-me-api";
import { ApiError } from "@/types/auth";
import { ROLES, type Role } from "@/types/user";

export type UserProfile = {
  username: string;
  role: Role;
  branchId: number | null;
  distributorId: number | null;
};

export async function resolveAndStoreUserProfile(
  token: string,
  remember = false,
): Promise<UserProfile> {
  const username = getUsernameFromToken(token);
  if (!username) {
    throw new ApiError("Token de sesión inválido", 401);
  }

  let role = getRoleFromToken(token);
  let branchId = getBranchIdFromToken(token);
  let distributorId = getDistributorIdFromToken(token);

  if (!role || (role === "DISTRIBUTOR" && distributorId == null)) {
    try {
      const me = await fetchAuthMe();
      role = role ?? me.role;
      branchId = branchId ?? me.branchId;
      distributorId = distributorId ?? me.distributorId ?? null;
    } catch {
      /* /api/auth/me no disponible */
    }
  }

  if (!role || !ROLES.includes(role)) {
    throw new ApiError(
      "Inicio de sesión correcto, pero no se pudo obtener el rol del usuario. " +
        "El backend debe emitir JWT con claim role o exponer GET /api/auth/me con role, branchId y distributorId.",
      401,
    );
  }

  const profile: UserProfile = {
    username,
    role,
    branchId: branchId ?? null,
    distributorId: distributorId ?? null,
  };

  setStoredProfile(
    {
      role: profile.role,
      branchId: profile.branchId,
      distributorId: profile.distributorId,
    },
    remember,
  );
  return profile;
}

export function getProfileFromStorage(
  username: string,
  token: string,
): UserProfile | null {
  const stored = getStoredProfile();
  const role = stored?.role ?? getRoleFromToken(token);
  if (!role) return null;

  return {
    username,
    role,
    branchId: stored?.branchId ?? getBranchIdFromToken(token) ?? null,
    distributorId:
      stored?.distributorId ?? getDistributorIdFromToken(token) ?? null,
  };
}

export function clearUserProfile() {
  clearStoredProfile();
}
