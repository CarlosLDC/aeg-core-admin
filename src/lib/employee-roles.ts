import {
  createDistributorPerson,
  deleteDistributorPerson,
} from "@/lib/distributor-persons-api";
import {
  createTechnician,
  deleteTechnician,
} from "@/lib/technicians-api";
import { ApiError } from "@/types/auth";
import type {
  DistributorPersonResponse,
  TechnicianResponse,
} from "@/types/employee-role";
import type { EmployeeResponse, EmployeeType } from "@/types/employee";
import type { Role } from "@/types/user";

export type EmployeeWithRoles = EmployeeResponse & {
  technician?: TechnicianResponse;
  distributorPerson?: DistributorPersonResponse;
};

/** Rol único en UI — combina categoría laboral y registros en tablas. */
export type EmployeeUiRole =
  | "administrativo"
  | "vendedor"
  | "gerente"
  | "tecnico_operativo"
  | "persona_distribuidor";

export const EMPLOYEE_UI_ROLES: EmployeeUiRole[] = [
  "administrativo",
  "vendedor",
  "gerente",
  "tecnico_operativo",
  "persona_distribuidor",
];

export const EMPLOYEE_UI_ROLE_LABELS: Record<EmployeeUiRole, string> = {
  administrativo: "Administrativo",
  vendedor: "Vendedor",
  gerente: "Gerente",
  tecnico_operativo: "Técnico",
  persona_distribuidor: "Persona distribuidor",
};

export const EMPLOYEE_UI_ROLE_STYLES: Record<EmployeeUiRole, string> = {
  administrativo: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  vendedor: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  gerente: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  tecnico_operativo: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  persona_distribuidor: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
};

export type EmployeeRoleFormState = {
  isTechnician: boolean;
  isDistributorPerson: boolean;
};

export function canAssignTechnicianRole(role: Role): boolean {
  return role === "ADMIN" || role === "TECHNICIAN" || role === "SERVICE_CENTER";
}

export function canAssignDistributorPersonRole(role: Role): boolean {
  return role === "ADMIN" || role === "DISTRIBUTOR";
}

export function uiRolesForUser(role: Role): EmployeeUiRole[] {
  return EMPLOYEE_UI_ROLES.filter((uiRole) => {
    if (uiRole === "tecnico_operativo") return canAssignTechnicianRole(role);
    if (uiRole === "persona_distribuidor") {
      return canAssignDistributorPersonRole(role);
    }
    return true;
  });
}

export function resolveEmployeeUiRole(employee: EmployeeWithRoles): EmployeeUiRole {
  if (employee.distributorPerson) return "persona_distribuidor";
  if (employee.technician) return "tecnico_operativo";
  if (employee.type === "vendedor") return "vendedor";
  if (employee.type === "gerente") return "gerente";
  if (employee.type === "tecnico") return "tecnico_operativo";
  return "administrativo";
}

export function uiRoleToBackend(uiRole: EmployeeUiRole): {
  type: EmployeeType;
  tableRoles: EmployeeRoleFormState;
} {
  switch (uiRole) {
    case "tecnico_operativo":
      return {
        type: "tecnico",
        tableRoles: { isTechnician: true, isDistributorPerson: false },
      };
    case "persona_distribuidor":
      return {
        type: "administrativo",
        tableRoles: { isTechnician: false, isDistributorPerson: true },
      };
    case "vendedor":
      return {
        type: "vendedor",
        tableRoles: { isTechnician: false, isDistributorPerson: false },
      };
    case "gerente":
      return {
        type: "gerente",
        tableRoles: { isTechnician: false, isDistributorPerson: false },
      };
    default:
      return {
        type: "administrativo",
        tableRoles: { isTechnician: false, isDistributorPerson: false },
      };
  }
}

export function mergeEmployeesWithRoles(
  employees: EmployeeResponse[],
  technicians: TechnicianResponse[],
  distributorPersons: DistributorPersonResponse[],
): EmployeeWithRoles[] {
  const technicianByEmployee = new Map(
    technicians.map((t) => [t.employeeId, t]),
  );
  const distributorPersonByEmployee = new Map(
    distributorPersons.map((d) => [d.employeeId, d]),
  );

  return employees.map((employee) => ({
    ...employee,
    technician: technicianByEmployee.get(employee.id),
    distributorPerson: distributorPersonByEmployee.get(employee.id),
  }));
}

export async function syncEmployeeRoles(
  employeeId: number,
  previous: EmployeeWithRoles | null,
  roles: EmployeeRoleFormState,
): Promise<void> {
  const prev: EmployeeWithRoles =
    previous ??
    ({
      id: employeeId,
      nationalId: "",
      name: "",
      phone: "",
      email: "",
      createdAt: "",
      type: "administrativo",
      branchId: 0,
    } satisfies EmployeeResponse);

  if (roles.isTechnician && !prev.technician) {
    await createTechnician({ employeeId });
  } else if (!roles.isTechnician && prev.technician) {
    await deleteTechnician(prev.technician.id);
  }

  if (roles.isDistributorPerson && !prev.distributorPerson) {
    await createDistributorPerson({ employeeId });
  } else if (!roles.isDistributorPerson && prev.distributorPerson) {
    await deleteDistributorPerson(prev.distributorPerson.id);
  }
}

export async function deleteEmployeeRoles(
  employee: EmployeeWithRoles,
): Promise<void> {
  if (employee.technician) {
    await deleteTechnician(employee.technician.id);
  }
  if (employee.distributorPerson) {
    await deleteDistributorPerson(employee.distributorPerson.id);
  }
}

export function getEmployeeRolesErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Ha ocurrido un error al gestionar el rol del empleado.";
}
