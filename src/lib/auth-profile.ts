import {
  clearStoredProfile,
  getStoredProfile,
  setStoredProfile,
} from "@/lib/auth-profile-storage";
import { isRemembered } from "@/lib/auth-storage";
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
  name: string | null;
  email: string;
  role: Role;
  branchId: number | null;
  distributorId: number | null;
};

function profileFromMe(
  username: string,
  me: Awaited<ReturnType<typeof fetchAuthMe>>,
): Pick<UserProfile, "name" | "email" | "role" | "branchId" | "distributorId"> {
  const email = me.email?.trim() || me.username?.trim() || username;
  return {
    name: me.name?.trim() || null,
    email,
    role: me.role,
    branchId: me.branchId ?? null,
    distributorId: me.distributorId ?? null,
  };
}

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
  let name: string | null = null;
  let email = username;

  try {
    const me = await fetchAuthMe();
    const fromMe = profileFromMe(username, me);
    role = role ?? fromMe.role;
    branchId = branchId ?? fromMe.branchId;
    distributorId = distributorId ?? fromMe.distributorId;
    name = fromMe.name;
    email = fromMe.email;
  } catch {
    /* /api/auth/me no disponible */
  }

  if (!role || !ROLES.includes(role)) {
    throw new ApiError(
      "Inicio de sesión correcto, pero no pudimos determinar tus permisos. Contacta al administrador del sistema.",
      401,
    );
  }

  const profile: UserProfile = {
    username,
    name,
    email,
    role,
    branchId: branchId ?? null,
    distributorId: distributorId ?? null,
  };

  setStoredProfile(
    {
      role: profile.role,
      branchId: profile.branchId,
      distributorId: profile.distributorId,
      name: profile.name,
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
    name: stored?.name ?? null,
    email: username,
    role,
    branchId: stored?.branchId ?? getBranchIdFromToken(token) ?? null,
    distributorId:
      stored?.distributorId ?? getDistributorIdFromToken(token) ?? null,
  };
}

export async function refreshUserProfileFromApi(
  username: string,
  token: string,
): Promise<UserProfile | null> {
  const current = getProfileFromStorage(username, token);
  if (!current) return null;

  try {
    const me = await fetchAuthMe();
    const fromMe = profileFromMe(username, me);
    const profile: UserProfile = {
      username,
      name: fromMe.name,
      email: fromMe.email,
      role: fromMe.role ?? current.role,
      branchId: fromMe.branchId ?? current.branchId,
      distributorId: fromMe.distributorId ?? current.distributorId,
    };

    setStoredProfile(
      {
        role: profile.role,
        branchId: profile.branchId,
        distributorId: profile.distributorId,
        name: profile.name,
      },
      isRemembered(),
    );
    return profile;
  } catch {
    return current;
  }
}

export function clearUserProfile() {
  clearStoredProfile();
}
