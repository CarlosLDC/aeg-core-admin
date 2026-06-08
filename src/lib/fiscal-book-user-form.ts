import type { FiscalBookRole } from "@/types/fiscal-book-user";

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FiscalBookUserFormValues = {
  name: string;
  email: string;
  password: string;
  role: FiscalBookRole;
  employeeId: string;
  enabled: boolean;
};

export function fiscalBookRoleRequiresEmployee(role: FiscalBookRole): boolean {
  return role === "FISCAL_TECHNICIAN";
}

export function validateFiscalBookUserCreateForm(
  values: FiscalBookUserFormValues,
): string | null {
  if (!values.name.trim()) return "Indica el nombre del usuario.";
  if (!EMAIL_PATTERN.test(values.email.trim())) return "Correo no válido.";
  if (values.password.trim().length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (fiscalBookRoleRequiresEmployee(values.role) && !values.employeeId.trim()) {
    return "Selecciona el empleado vinculado al técnico fiscal.";
  }
  return null;
}

export function validateFiscalBookUserEditForm(
  values: FiscalBookUserFormValues,
): string | null {
  if (!values.name.trim()) return "Indica el nombre del usuario.";
  if (!EMAIL_PATTERN.test(values.email.trim())) return "Correo no válido.";
  if (
    values.password.trim() &&
    values.password.trim().length < MIN_PASSWORD_LENGTH
  ) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (fiscalBookRoleRequiresEmployee(values.role) && !values.employeeId.trim()) {
    return "Selecciona el empleado vinculado al técnico fiscal.";
  }
  return null;
}

export function resolveFiscalBookEmployeeId(
  role: FiscalBookRole,
  employeeId: string,
): number | null {
  if (!fiscalBookRoleRequiresEmployee(role)) return null;
  const id = Number(employeeId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}
