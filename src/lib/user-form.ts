import { isDistributorPanelRole, type Role } from "@/types/user";
import { formatCedula, parseCedula } from "@/lib/venezuelan-id";

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UserFormFields = {
  name: string;
  email: string;
  password: string;
  role: Role;
  distributorId: string;
  branchId: string;
  nationalId: string;
};

export function roleRequiresDistributorProfile(role: Role): boolean {
  return role === "DISTRIBUTOR";
}

export function roleRequiresServiceCenterBranch(role: Role): boolean {
  return role === "TECHNICIAN";
}

export function roleRequiresAdminEmployeeProfile(role: Role): boolean {
  return role === "ADMIN";
}

export function roleRequiresNationalId(role: Role): boolean {
  return (
    roleRequiresDistributorProfile(role) ||
    roleRequiresServiceCenterBranch(role) ||
    roleRequiresAdminEmployeeProfile(role)
  );
}

/** @deprecated use roleRequiresDistributorProfile */
export function roleRequiresTechnicianProfile(role: Role): boolean {
  return roleRequiresDistributorProfile(role);
}

export function normalizeNationalId(value: string): string {
  const { letter, digits } = parseCedula(value);
  return formatCedula(letter, digits);
}

function distributorIdToNumber(distributorId: string): number | null {
  const id = Number(distributorId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

function branchIdToNumber(branchId: string): number | null {
  const id = Number(branchId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export function resolveUserDistributorId(
  role: Role,
  distributorId: string,
): number | null {
  if (!roleRequiresDistributorProfile(role)) return null;
  return distributorIdToNumber(distributorId);
}

export function resolveUserBranchId(role: Role, branchId: string): number | null {
  if (!roleRequiresServiceCenterBranch(role)) return null;
  return branchIdToNumber(branchId);
}

export function resolveUserNationalId(
  role: Role,
  nationalId: string,
): string | null {
  if (!roleRequiresNationalId(role)) {
    return null;
  }
  const normalized = normalizeNationalId(nationalId);
  return normalized || null;
}

function validateAdminEmployeeProfile(role: Role, nationalId: string): string | null {
  if (!roleRequiresAdminEmployeeProfile(role)) return null;
  if (!normalizeNationalId(nationalId)) {
    return "La cédula es obligatoria para administradores.";
  }
  return null;
}

function validateDistributorProfile(
  role: Role,
  distributorId: string,
  nationalId: string,
): string | null {
  if (!roleRequiresDistributorProfile(role)) return null;

  if (!distributorId.trim()) {
    return "Selecciona una distribuidora.";
  }
  if (!distributorIdToNumber(distributorId)) {
    return "La distribuidora seleccionada no es válida.";
  }
  if (!normalizeNationalId(nationalId)) {
    return "La cédula es obligatoria para usuarios de distribuidora.";
  }
  return null;
}

function validateServiceCenterProfile(
  role: Role,
  branchId: string,
  nationalId: string,
): string | null {
  if (!roleRequiresServiceCenterBranch(role)) return null;
  if (!branchId.trim()) {
    return "Selecciona la sucursal.";
  }
  if (!branchIdToNumber(branchId)) {
    return "La sucursal seleccionada no es válida.";
  }
  if (role === "TECHNICIAN" && !normalizeNationalId(nationalId)) {
    return "La cédula es obligatoria para técnicos.";
  }
  return null;
}

export function validateUserCreateForm(values: UserFormFields): string | null {
  const name = values.name.trim();
  if (!name) return "El nombre es obligatorio.";

  const email = values.email.trim().toLowerCase();
  if (!email) return "El correo es obligatorio.";
  if (!EMAIL_PATTERN.test(email)) return "El correo no tiene un formato válido.";

  if (values.password.length < MIN_PASSWORD_LENGTH) {
    return `La clave debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  const adminError = validateAdminEmployeeProfile(values.role, values.nationalId);
  if (adminError) return adminError;

  const distributorError = validateDistributorProfile(
    values.role,
    values.distributorId,
    values.nationalId,
  );
  if (distributorError) return distributorError;

  const serviceCenterError = validateServiceCenterProfile(
    values.role,
    values.branchId,
    values.nationalId,
  );
  if (serviceCenterError) return serviceCenterError;

  return null;
}

export function validateUserEditForm(values: UserFormFields): string | null {
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

  const adminError = validateAdminEmployeeProfile(values.role, values.nationalId);
  if (adminError) return adminError;

  const distributorError = validateDistributorProfile(
    values.role,
    values.distributorId,
    values.nationalId,
  );
  if (distributorError) return distributorError;

  const serviceCenterError = validateServiceCenterProfile(
    values.role,
    values.branchId,
    values.nationalId,
  );
  if (serviceCenterError) return serviceCenterError;

  return null;
}
