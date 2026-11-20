import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type { Role } from "@/types/user";

export type InvitationValidationResponse = {
  valid: boolean;
  name: string;
  email: string;
  role: Role;
  expiresAt: string;
};

export type AcceptInviteResponse = {
  token: string;
  role: Role;
  email: string;
  name: string;
};

export type PasswordResetValidationResponse = {
  valid: boolean;
  email: string;
  expiresAt: string;
};

export type AuthMessageResponse = {
  message: string;
};

export async function validateInvitationToken(
  token: string,
): Promise<InvitationValidationResponse> {
  return apiFetch<InvitationValidationResponse>(
    `/api/auth/invitations/validate?token=${encodeURIComponent(token)}`,
    { auth: false },
  );
}

export async function acceptInvitation(
  token: string,
  password: string,
): Promise<AcceptInviteResponse> {
  return apiFetch<AcceptInviteResponse>("/api/auth/accept-invite", {
    method: "POST",
    body: JSON.stringify({ token, password, portal: "CORE_ADMIN" }),
    auth: false,
  });
}

export async function requestPasswordReset(
  email: string,
): Promise<AuthMessageResponse> {
  return apiFetch<AuthMessageResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
    auth: false,
  });
}

export async function validatePasswordResetToken(
  token: string,
): Promise<PasswordResetValidationResponse> {
  return apiFetch<PasswordResetValidationResponse>(
    `/api/auth/password-reset/validate?token=${encodeURIComponent(token)}`,
    { auth: false },
  );
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<AuthMessageResponse> {
  return apiFetch<AuthMessageResponse>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
    auth: false,
  });
}

export function getAuthActionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return error.message || "El enlace es inválido, ya fue utilizado o expiró.";
    }
    if (error.status === 429) {
      return (
        error.message ||
        "Has realizado demasiados intentos. Espera unos minutos e inténtalo de nuevo."
      );
    }
    if (error.status === 502) {
      return "No se pudo enviar el correo en este momento. Inténtalo de nuevo más tarde.";
    }
    return error.message || "No se pudo completar la operación.";
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Ha ocurrido un error inesperado.";
}
