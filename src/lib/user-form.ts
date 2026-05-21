import type { DistributorResponse } from "@/types/branch-role";
import type { ServiceCenterResponse } from "@/types/branch-role";
import type { Role } from "@/types/user";

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function roleRequiresBranch(role: Role): boolean {
  return role === "DISTRIBUTOR" || role === "TECHNICIAN" || role === "SERVICE_CENTER";
}

type UserFormFields = {
  name: string;
  email: string;
  password: string;
  role: Role;
  branchId: string;
};

type UserFormContext = {
  distributors: DistributorResponse[];
  serviceCenters: ServiceCenterResponse[];
};

function branchIdToNumber(branchId: string): number | null {
  const id = Number(branchId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export function branchIdsWithDistributorRole(
  distributors: DistributorResponse[],
): Set<number> {
  return new Set(distributors.map((d) => d.branchId));
}

export function branchIdsWithServiceCenterRole(
  serviceCenters: ServiceCenterResponse[],
): Set<number> {
  return new Set(serviceCenters.map((s) => s.branchId));
}

export function eligibleRolesForBranch(
  branchId: string,
  context: UserFormContext,
): Role[] {
  const id = branchIdToNumber(branchId);
  if (!id) return [];
  const roles: Role[] = [];
  if (branchIdsWithDistributorRole(context.distributors).has(id)) {
    roles.push("DISTRIBUTOR");
  }
  if (branchIdsWithServiceCenterRole(context.serviceCenters).has(id)) {
    roles.push("SERVICE_CENTER", "TECHNICIAN");
  }
  return roles;
}

function validateRoleByBranch(
  role: Role,
  branchId: string,
  context: UserFormContext,
): string | null {
  if (!branchId.trim()) {
    return "Selecciona una sucursal.";
  }
  const eligible = eligibleRolesForBranch(branchId, context);
  if (eligible.length === 0) {
    return "La sucursal seleccionada no tiene roles operativos habilitados para usuarios.";
  }
  if (!eligible.includes(role)) {
    return "El rol seleccionado no está habilitado para la sucursal elegida.";
  }
  return null;
}

export function validateUserCreateForm(
  values: UserFormFields,
  context: UserFormContext,
): string | null {
  const name = values.name.trim();
  if (!name) return "El nombre es obligatorio.";

  const email = values.email.trim().toLowerCase();
  if (!email) return "El correo es obligatorio.";
  if (!EMAIL_PATTERN.test(email)) return "El correo no tiene un formato válido.";

  if (values.password.length < MIN_PASSWORD_LENGTH) {
    return `La clave debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  const roleError = validateRoleByBranch(
    values.role,
    values.branchId,
    context,
  );
  if (roleError) return roleError;

  return null;
}

export function validateUserEditForm(
  values: UserFormFields,
  context: UserFormContext,
): string | null {
  const name = values.name.trim();
  if (!name) return "El nombre es obligatorio.";

  const email = values.email.trim().toLowerCase();
  if (!email) return "El correo es obligatorio.";
  if (!EMAIL_PATTERN.test(email)) return "El correo no tiene un formato válido.";

  if (
    values.password.trim().length > 0 &&
    values.password.length < MIN_PASSWORD_LENGTH
  ) {
    return `La clave debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  const roleError = validateRoleByBranch(
    values.role,
    values.branchId,
    context,
  );
  if (roleError) return roleError;

  return null;
}
