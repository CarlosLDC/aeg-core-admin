import { apiFetch } from "@/lib/api";
import { getCatalogForbiddenMessage } from "@/lib/api-permissions";
import { ApiError } from "@/types/auth";
import type { EmployeeRequest, EmployeeResponse } from "@/types/employee";

const BASE = "/api/employees";

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

export function getEmployeesErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return getCatalogForbiddenMessage("MODIFY");
    }
    if (error.status === 404) {
      return "Empleado no encontrado.";
    }
    if (error.status === 409 || error.status === 400) {
      if (/nationalId|cedula/i.test(error.message)) {
        return "Ya existe un empleado con esa cédula o documento.";
      }
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
