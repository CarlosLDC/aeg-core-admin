import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  UserRegistrationRequest,
  UserResponse,
  UserUpdateRequest,
} from "@/types/user";

const BASE = "/api/admin/users";

export async function fetchUsers(): Promise<UserResponse[]> {
  return apiFetch<UserResponse[]>(BASE);
}

export async function fetchUserById(id: number): Promise<UserResponse> {
  return apiFetch<UserResponse>(`${BASE}/${id}`);
}

export async function createUser(
  body: UserRegistrationRequest,
): Promise<UserResponse> {
  return apiFetch<UserResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateUser(
  id: number,
  body: UserUpdateRequest,
): Promise<UserResponse> {
  return apiFetch<UserResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteUser(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" });
}

export function getUsersErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Sesión no válida. Vuelve a iniciar sesión.";
    }
    if (error.status === 403) {
      return "Solo usuarios con rol ADMIN pueden gestionar usuarios.";
    }
    if (error.status === 409) {
      return "Ese nombre de usuario ya está en uso.";
    }
    if (error.status === 404) {
      return "Usuario o sucursal no encontrados.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
