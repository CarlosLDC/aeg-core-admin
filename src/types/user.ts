/** Roles persistidos en User.role — Spring Security los expone como ROLE_* */
export const ROLES = [
  "ADMIN",
  "DISTRIBUTOR",
  "TECHNICIAN",
  "SERVICE_CENTER",
  "SENIAT",
] as const;

export type Role = (typeof ROLES)[number];

export const DISTRIBUTOR_PANEL_ROLES = ["DISTRIBUTOR"] as const;

export type DistributorPanelRole = (typeof DISTRIBUTOR_PANEL_ROLES)[number];

export function isDistributorPanelRole(
  role: Role | null | undefined,
): role is DistributorPanelRole {
  return role === "DISTRIBUTOR";
}

export function isServiceCenterStaffRole(role: Role | null | undefined): boolean {
  return role === "TECHNICIAN" || role === "SERVICE_CENTER";
}

export function isServiceCenterStaff(
  user: Pick<UserResponse, "role" | "branchId"> | null | undefined,
): boolean {
  return (
    user != null &&
    isServiceCenterStaffRole(user.role) &&
    user.branchId != null
  );
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
