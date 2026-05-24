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
  name: string;
  email: string;
  username?: string;
  role: Role;
  branchId: number | null;
  enabled: boolean;
};

export type UserRegistrationRequest = {
  name: string;
  email: string;
  password: string;
  role: Role;
  branchId: number | null;
};

export type UserUpdateRequest = {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  branchId?: number | null;
  enabled?: boolean;
};
