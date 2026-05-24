import {
  createDistributorPerson,
  deleteDistributorPerson,
  fetchDistributorPersons,
} from "@/lib/distributor-persons-api";
import { fetchEmployeeById } from "@/lib/employees-api";
import {
  createTechnician,
  deleteTechnician,
  fetchTechnicians,
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

/** Rol operativo en UI — solo distribuidor o técnico. */
export type EmployeeUiRole = "distribuidor" | "tecnico";

export const EMPLOYEE_UI_ROLES: EmployeeUiRole[] = ["distribuidor", "tecnico"];

export const EMPLOYEE_UI_ROLE_LABELS: Record<EmployeeUiRole, string> = {
  distribuidor: "Distribuidor",
  tecnico: "Técnico",
};

export const EMPLOYEE_UI_ROLE_STYLES: Record<EmployeeUiRole, string> = {
  distribuidor: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  tecnico: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
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
    if (uiRole === "tecnico") return canAssignTechnicianRole(role);
    return canAssignDistributorPersonRole(role);
  });
}

export function resolveEmployeeUiRole(employee: EmployeeWithRoles): EmployeeUiRole {
  if (employee.technician || employee.type === "tecnico") return "tecnico";
  return "distribuidor";
}

export function uiRoleToBackend(uiRole: EmployeeUiRole): {
  type: EmployeeType;
  tableRoles: EmployeeRoleFormState;
} {
  if (uiRole === "tecnico") {
    return {
      type: "tecnico",
      tableRoles: { isTechnician: true, isDistributorPerson: false },
    };
  }
  return {
    type: "administrativo",
    tableRoles: { isTechnician: false, isDistributorPerson: true },
  };
}

/** Distribuidores no pueden listar técnicos (403 en GET /api/technicians). */
export async function fetchEmployeeRoleTables(role: Role): Promise<{
  technicians: TechnicianResponse[];
  distributorPersons: DistributorPersonResponse[];
}> {
  const [technicians, distributorPersons] = await Promise.all([
    role === "DISTRIBUTOR"
      ? Promise.resolve([] as TechnicianResponse[])
      : fetchTechnicians(),
    fetchDistributorPersons(),
  ]);
  return { technicians, distributorPersons };
}

export async function loadEmployeeWithRoles(
  employeeId: number,
  role: Role,
): Promise<EmployeeWithRoles> {
  const [row, { technicians, distributorPersons }] = await Promise.all([
    fetchEmployeeById(employeeId),
    fetchEmployeeRoleTables(role),
  ]);
  const merged = mergeEmployeesWithRoles(
    [row],
    technicians.filter((t) => t.employeeId === employeeId),
    distributorPersons.filter((d) => d.employeeId === employeeId),
  );
  const record = merged[0];
  if (!record) {
    throw new Error("Empleado no encontrado.");
  }
  return record;
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

async function resolveTechnicianForEmployee(
  employeeId: number,
  known?: TechnicianResponse,
): Promise<TechnicianResponse | undefined> {
  if (known) return known;
  const technicians = await fetchTechnicians();
  return technicians.find((t) => t.employeeId === employeeId);
}

async function resolveDistributorPersonForEmployee(
  employeeId: number,
  known?: DistributorPersonResponse,
): Promise<DistributorPersonResponse | undefined> {
  if (known) return known;
  const persons = await fetchDistributorPersons();
  return persons.find((d) => d.employeeId === employeeId);
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
      reviewStatus: "ACTIVE",
      activeModificationRequestId: null,
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
  const technician = await resolveTechnicianForEmployee(
    employee.id,
    employee.technician,
  );
  if (technician) {
    await deleteTechnician(technician.id);
  }

  const distributorPerson = await resolveDistributorPersonForEmployee(
    employee.id,
    employee.distributorPerson,
  );
  if (distributorPerson) {
    await deleteDistributorPerson(distributorPerson.id);
  }
}

export function getEmployeeRolesErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Ha ocurrido un error al gestionar el rol del empleado.";
}
