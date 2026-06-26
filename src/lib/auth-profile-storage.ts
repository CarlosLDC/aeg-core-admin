import type { Role } from "@/types/user";

export type StoredUserProfile = {
  id?: number | null;
  role: Role;
  branchId: number | null;
  distributorId: number | null;
  name: string | null;
};

const PROFILE_KEY = "aeg-user-profile";

export function setStoredProfile(profile: StoredUserProfile, remember: boolean) {
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  if (remember) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } else {
    localStorage.removeItem(PROFILE_KEY);
  }
}

export function getStoredProfile(): StoredUserProfile | null {
  const raw =
    sessionStorage.getItem(PROFILE_KEY) ??
    localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredUserProfile>;
    if (!parsed.role) return null;
    return {
      id: parsed.id ?? null,
      role: parsed.role,
      branchId: parsed.branchId ?? null,
      distributorId: parsed.distributorId ?? null,
      name: typeof parsed.name === "string" ? parsed.name : null,
    };
  } catch {
    return null;
  }
}

export function clearStoredProfile() {
  sessionStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(PROFILE_KEY);
}
