import {
  resolveEmployeeUiRole,
  uiRoleToBackend,
  type EmployeeUiRole,
  type EmployeeWithRoles,
} from "@/lib/employee-roles";
import type { EmployeeRequest } from "@/types/employee";
import type { EmployeeModificationProposedData } from "@/types/employee-modification-request";
import type { EmployeeRoleFormState } from "@/lib/employee-roles";

export type EmployeeFormValues = {
  nationalId: string;
  name: string;
  phone: string;
  email: string;
  branchId: string;
  role: EmployeeUiRole;
};

export function employeeToFormValues(employee: EmployeeWithRoles): EmployeeFormValues {
  return {
    nationalId: employee.nationalId,
    name: employee.name,
    phone: employee.phone,
    email: employee.email,
    branchId: String(employee.branchId),
    role: resolveEmployeeUiRole(employee),
  };
}

export function toEmployeePayload(
  values: EmployeeFormValues,
): { request: EmployeeRequest; tableRoles: ReturnType<typeof uiRoleToBackend>["tableRoles"] } | string {
  const nationalId = values.nationalId.trim();
  const name = values.name.trim();
  const phone = values.phone.trim();
  const email = values.email.trim();

  if (!nationalId) return "La cédula o documento es obligatorio.";
  if (!name) return "El nombre es obligatorio.";
  if (!phone) return "El teléfono es obligatorio.";
  if (!email) return "El correo es obligatorio.";
  if (!values.branchId.trim()) return "Selecciona la sucursal del empleado.";

  const branchId = Number(values.branchId);
  if (!Number.isFinite(branchId)) {
    return "La sucursal seleccionada no es válida.";
  }

  const { type, tableRoles } = uiRoleToBackend(values.role);

  return {
    request: {
      nationalId,
      name,
      phone,
      email,
      type,
      branchId,
    },
    tableRoles,
  };
}

export function toModificationProposedData(
  request: EmployeeRequest,
  tableRoles: EmployeeRoleFormState,
): EmployeeModificationProposedData {
  return {
    ...request,
    isTechnician: tableRoles.isTechnician,
    isDistributorPerson: tableRoles.isDistributorPerson,
  };
}

export function formatEmployeeDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
