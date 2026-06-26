/** Roles persistidos en User.role — Spring Security los expone como ROLE_* */
export const ROLES = [
  "ADMIN",
  "DISTRIBUTOR",
  "TECHNICIAN",
  "SERVICE_CENTER",
  "SENIAT",
] as const;

export type Role = (typeof ROLES)[number];

export const DISTRIBUTOR_PANEL_ROLES = ["DISTRIBUTOR", "TECHNICIAN"] as const;

export type DistributorPanelRole = (typeof DISTRIBUTOR_PANEL_ROLES)[number];

export function isDistributorPanelRole(
  role: Role | null | undefined,
): role is DistributorPanelRole {
  return role === "DISTRIBUTOR" || role === "TECHNICIAN";
}

export type UserResponse = {
  id: number;
  name: string;
  email: string;
  username?: string;
  role: Role;
  branchId: number | null;
  distributorId: number | null;
  nationalId: string | null;
  enabled: boolean;
};

export type UserRegistrationRequest = {
  name: string;
  email: string;
  password: string;
  role: Role;
  distributorId?: number | null;
  branchId?: number | null;
  nationalId?: string | null;
};

export type UserUpdateRequest = {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  distributorId?: number | null;
  branchId?: number | null;
  nationalId?: string | null;
  enabled?: boolean;
};
