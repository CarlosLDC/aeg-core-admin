import type { EmployeeWithRoles } from "@/lib/employee-roles";
import type { EmployeeRequest } from "@/types/employee";
import type { EmployeeModificationProposedData } from "@/types/employee-modification-request";

export type EmployeeFormValues = {
  nationalId: string;
  name: string;
  phone: string;
  email: string;
  companyId: string;
};

export function employeeToFormValues(employee: EmployeeWithRoles): EmployeeFormValues {
  return {
    nationalId: employee.nationalId,
    name: employee.name,
    phone: employee.phone,
    email: employee.email,
    companyId: String(employee.companyId),
  };
}

export function toEmployeePayload(
  values: EmployeeFormValues,
): { request: EmployeeRequest } | string {
  const nationalId = values.nationalId.trim();
  const name = values.name.trim();
  const phone = values.phone.trim();
  const email = values.email.trim();

  if (!nationalId) return "La cédula o documento es obligatorio.";
  if (!name) return "El nombre es obligatorio.";
  if (!phone) return "El teléfono es obligatorio.";
  if (!email) return "El correo es obligatorio.";
  if (!values.companyId.trim()) return "Selecciona la empresa del empleado.";

  const companyId = Number(values.companyId);
  if (!Number.isFinite(companyId)) {
    return "La empresa seleccionada no es válida.";
  }

  return {
    request: {
      nationalId,
      name,
      phone,
      email,
      type: "tecnico",
      companyId,
    },
  };
}

export function toModificationProposedData(
  request: EmployeeRequest,
): EmployeeModificationProposedData {
  return { ...request };
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
