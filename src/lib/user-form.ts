import { isUserRoleAssignable } from "@/lib/roles";
import type { DistributorResponse } from "@/types/branch-role";
import type { Role } from "@/types/user";

const MIN_PASSWORD_LENGTH = 6;

export function roleRequiresBranch(role: Role): boolean {
  return role !== "ADMIN";
}

export function roleRequiresDistributorId(role: Role): boolean {
  return role === "DISTRIBUTOR";
}

export function findDistributorForBranch(
  branchId: string,
  distributors: DistributorResponse[],
): DistributorResponse | undefined {
  const id = Number(branchId);
  if (!Number.isFinite(id) || id <= 0) return undefined;
  return distributors.find((d) => d.branchId === id);
}

export function branchIdsWithDistributorRole(
  distributors: DistributorResponse[],
): Set<number> {
  return new Set(distributors.map((d) => d.branchId));
}

type UserFormFields = {
  username: string;
  password: string;
  role: Role;
  branchId: string;
  distributorId: string;
};

type UserFormContext = {
  distributors: DistributorResponse[];
};

function validateDistributorBranchLink(
  role: Role,
  branchId: string,
  distributorId: string,
  distributors: DistributorResponse[],
): string | null {
  if (role !== "DISTRIBUTOR") return null;

  const distributorOnBranch = findDistributorForBranch(branchId, distributors);
  if (!distributorOnBranch) {
    return "La sucursal debe tener rol de distribuidor (regístrala en Sucursales) para asignar un usuario distribuidor.";
  }

  const selectedId = distributorId.trim();
  if (selectedId && Number(selectedId) !== distributorOnBranch.id) {
    return "El registro de distribuidor debe corresponder a la sucursal seleccionada.";
  }

  return null;
}

export function validateUserCreateForm(
  values: UserFormFields,
  context: UserFormContext,
): string | null {
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

  const distributorLinkError = validateDistributorBranchLink(
    values.role,
    values.branchId,
    values.distributorId,
    context.distributors,
  );
  if (distributorLinkError) return distributorLinkError;

  if (roleRequiresDistributorId(values.role) && !values.distributorId.trim()) {
    return "Selecciona el registro de distribuidor (distributorId).";
  }

  return null;
}

export function validateUserEditForm(
  values: UserFormFields,
  context: UserFormContext,
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

  const distributorLinkError = validateDistributorBranchLink(
    values.role,
    values.branchId,
    values.distributorId,
    context.distributors,
  );
  if (distributorLinkError) return distributorLinkError;

  if (roleRequiresDistributorId(values.role) && !values.distributorId.trim()) {
    return "Selecciona el registro de distribuidor (distributorId).";
  }

  return null;
}
