import { apiFetch } from "@/lib/api";
import {
  clearUserProfile,
  getProfileFromStorage,
  resolveAndStoreUserProfile,
  type UserProfile,
} from "@/lib/auth-profile";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "@/lib/auth-storage";
import { getUsernameFromToken, isTokenExpired } from "@/lib/jwt";
import type { AuthResponse, LoginRequest } from "@/types/auth";
import { ApiError } from "@/types/auth";

export async function login(
  credentials: LoginRequest,
  remember: boolean,
): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
    auth: false,
  });

  setStoredToken(data.token, remember);
  await resolveAndStoreUserProfile(data.token, remember);
  return data;
}

export function logout() {
  clearStoredToken();
  clearUserProfile();
}

export function getSession(): (UserProfile & { token: string }) | null {
  const token = getStoredToken();
  if (!token || isTokenExpired(token)) {
    if (token) {
      clearStoredToken();
      clearUserProfile();
    }
    return null;
  }

  const username = getUsernameFromToken(token);
  if (!username) {
    clearStoredToken();
    clearUserProfile();
    return null;
  }

  const profile = getProfileFromStorage(username, token);
  if (!profile) return null;

  return { token, ...profile };
}

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (
      error.status === 401 &&
      error.message.includes("token no incluye el rol")
    ) {
      return error.message;
    }
    if (error.status === 401) {
      return "Usuario o contraseña incorrectos";
    }
    if (error.status === 403) {
      return "No tienes permiso para acceder";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor. Comprueba tu conexión.";
  }
  return "No se pudo iniciar sesión. Inténtalo de nuevo.";
}
