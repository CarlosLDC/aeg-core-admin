import { isUserRoleAssignable } from "@/lib/roles";
import type { Role } from "@/types/user";

const MIN_PASSWORD_LENGTH = 6;

export function roleRequiresBranch(role: Role): boolean {
  return role !== "ADMIN";
}

export function roleRequiresDistributorId(role: Role): boolean {
  return role === "DISTRIBUTOR";
}

export function validateUserCreateForm(values: {
  username: string;
  password: string;
  role: Role;
  branchId: string;
  distributorId: string;
}): string | null {
  const username = values.username.trim();
  if (!username) return "El nombre de usuario es obligatorio.";

  if (!isUserRoleAssignable(values.role)) {
    return "Ese rol no está disponible para asignación temporalmente.";
  }

  if (values.password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (roleRequiresBranch(values.role) && !values.branchId.trim()) {
    return "Selecciona una sucursal para este rol.";
  }

  if (roleRequiresDistributorId(values.role) && !values.distributorId.trim()) {
    return "Selecciona el registro de distribuidor (distributorId).";
  }

  return null;
}

export function validateUserEditForm(
  values: {
    username: string;
    password: string;
    role: Role;
    branchId: string;
    distributorId: string;
  },
  previousRole?: Role,
): string | null {
  const username = values.username.trim();
  if (!username) return "El nombre de usuario es obligatorio.";

  if (!isUserRoleAssignable(values.role, previousRole)) {
    return "Ese rol no está disponible para asignación temporalmente.";
  }

  if (
    values.password.trim().length > 0 &&
    values.password.length < MIN_PASSWORD_LENGTH
  ) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (roleRequiresBranch(values.role) && !values.branchId.trim()) {
    return "Selecciona una sucursal para este rol.";
  }

  if (roleRequiresDistributorId(values.role) && !values.distributorId.trim()) {
    return "Selecciona el registro de distribuidor (distributorId).";
  }

  return null;
}
