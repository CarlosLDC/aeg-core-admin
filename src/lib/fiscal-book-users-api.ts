import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  FiscalBookUserRegistrationRequest,
  FiscalBookUserResponse,
  FiscalBookUserUpdateRequest,
} from "@/types/fiscal-book-user";

const BASE = "/api/admin/fiscal-book-users";

export async function fetchFiscalBookUsers(): Promise<FiscalBookUserResponse[]> {
  return apiFetch<FiscalBookUserResponse[]>(BASE);
}

export async function fetchFiscalBookUserById(
  id: number,
): Promise<FiscalBookUserResponse> {
  return apiFetch<FiscalBookUserResponse>(`${BASE}/${id}`);
}

export async function createFiscalBookUser(
  body: FiscalBookUserRegistrationRequest,
): Promise<FiscalBookUserResponse> {
  return apiFetch<FiscalBookUserResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateFiscalBookUser(
  id: number,
  body: FiscalBookUserUpdateRequest,
): Promise<FiscalBookUserResponse> {
  return apiFetch<FiscalBookUserResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteFiscalBookUser(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getFiscalBookUsersErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Sesión no válida. Vuelve a iniciar sesión.";
    }
    if (error.status === 403) {
      return "Solo un administrador puede gestionar usuarios del libro fiscal.";
    }
    if (error.status === 409) {
      return "Ese correo ya está en uso en el panel o en el libro fiscal.";
    }
    if (error.status === 404) {
      return "Usuario o empleado no encontrados.";
    }
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "No se pudo completar la operación.";
}
