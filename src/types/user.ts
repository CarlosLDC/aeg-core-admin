/** Roles persistidos en User.role — Spring Security los expone como ROLE_* */
export const ROLES = [
  "ADMIN",
  "DISTRIBUTOR",
  "TECHNICIAN",
  "SERVICE_CENTER",
] as const;

export type Role = (typeof ROLES)[number];

export type UserResponse = {
  id: number;
  username: string;
  role: Role;
  branchId: number | null;
  distributorId?: number | null;
  enabled: boolean;
};

export type UserRegistrationRequest = {
  username: string;
  password: string;
  role: Role;
  branchId?: number | null;
  distributorId?: number | null;
};

export type UserUpdateRequest = {
  username?: string;
  password?: string;
  role?: Role;
  branchId?: number | null;
  distributorId?: number | null;
  enabled?: boolean;
};
