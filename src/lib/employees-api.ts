import { apiFetch } from "@/lib/api";
import { getCatalogForbiddenMessage } from "@/lib/api-permissions";
import { ApiError } from "@/types/auth";
import type { EmployeeRequest, EmployeeResponse } from "@/types/employee";
import type { EmployeeModificationProposedData } from "@/types/employee-modification-request";

const BASE = "/api/employees";
const MOD_REQUESTS_BASE = "/api/employee-modification-requests";

export async function fetchEmployees(): Promise<EmployeeResponse[]> {
  return apiFetch<EmployeeResponse[]>(BASE);
}

export async function fetchEmployeeById(id: number): Promise<EmployeeResponse> {
  return apiFetch<EmployeeResponse>(`${BASE}/${id}`);
}

export async function createEmployee(
  body: EmployeeRequest,
): Promise<EmployeeResponse> {
  return apiFetch<EmployeeResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateEmployee(
  id: number,
  body: EmployeeRequest,
): Promise<EmployeeResponse> {
  return apiFetch<EmployeeResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteEmployee(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export async function requestEmployeeUpdate(
  employeeId: number,
  proposedData: EmployeeModificationProposedData,
): Promise<void> {
  return apiFetch<void>(`${MOD_REQUESTS_BASE}/update`, {
    method: "POST",
    body: JSON.stringify({ employeeId, proposedData }),
  });
}

export async function requestEmployeeDelete(employeeId: number): Promise<void> {
  return apiFetch<void>(`${MOD_REQUESTS_BASE}/delete`, {
    method: "POST",
    body: JSON.stringify({ employeeId }),
  });
}

export function getEmployeesErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      if (/employee|empleado|branch|sucursal/i.test(error.message)) {
        return error.message;
      }
      return getCatalogForbiddenMessage("MODIFY");
    }
    if (error.status === 404) {
      return "Empleado no encontrado.";
    }
    if (error.status === 409 || error.status === 400) {
      if (/nationalId|cedula/i.test(error.message)) {
        return "Ya existe un empleado con esa cédula o documento.";
      }
      if (/pending|pendiente|review/i.test(error.message)) {
        return "El empleado ya tiene una solicitud pendiente de aprobación.";
      }
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
