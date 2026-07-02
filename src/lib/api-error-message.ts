import { ApiError } from "@/types/auth";
import { CLIENT_REASSIGNMENT_MODAL } from "@/lib/client-reassignment";

const REFERENTIAL_INTEGRITY_MESSAGE =
  "No se puede realizar la operación porque el registro está siendo referenciado o hace referencia a un registro inexistente.";

const REFERENTIAL_INTEGRITY_TOAST =
  "No se puede completar la operación por dependencias vinculadas.";

export function isReferentialIntegrityMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("siendo referenciado") ||
    lower.includes("referenciado o hace referencia") ||
    lower.includes("integridad referencial")
  );
}

/** Mensaje breve para notificaciones flash (toast). */
export function toToastErrorMessage(message: string): string {
  if (isReferentialIntegrityMessage(message)) {
    return REFERENTIAL_INTEGRITY_TOAST;
  }
  return message;
}

/** Mensaje detallado para la alerta sobre la tabla. */
export function toListErrorMessage(
  message: string,
  recordLabel?: string | null,
): string {
  if (!isReferentialIntegrityMessage(message)) {
    return message;
  }
  const label = recordLabel?.trim();
  if (label) {
    return `No se puede eliminar «${label}» porque está siendo referenciado o hace referencia a un registro inexistente.`;
  }
  return REFERENTIAL_INTEGRITY_MESSAGE;
}

export function reportListTableError(options: {
  message: string;
  recordLabel?: string | null;
  setListError: (message: string | null) => void;
  toast: { error: (message: string) => void };
}): void {
  options.setListError(
    toListErrorMessage(options.message, options.recordLabel),
  );
  options.toast.error(toToastErrorMessage(options.message));
}

/** Maps fetch/API failures to user-facing Spanish messages (for tests and reuse). */
export async function readErrorMessageFromResponse(
  response: Response,
): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };
      return (
        data.message ??
        data.error ??
        (response.statusText || `Error del servidor (${response.status})`)
      );
    }
    const text = (await response.text()).trim();
    if (text && text.length < 200 && !text.startsWith("<")) {
      return text;
    }
  } catch {
    /* cuerpo no legible */
  }
  if (response.status === 401) {
    return "Usuario o contraseña incorrectos";
  }
  if (response.status === 403) {
    return "No tienes permiso para realizar esta acción";
  }
  if (response.status >= 500) {
    return `Error del servidor (${response.status}). Inténtalo más tarde.`;
  }
  return response.statusText || `Error en la petición (${response.status})`;
}

function mapCatalogApiMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("not allowed to access branch")) {
    return "No tienes permiso sobre esa sucursal.";
  }
  if (lower.includes("branch already assigned to another distributor")) {
    return CLIENT_REASSIGNMENT_MODAL.message;
  }
  if (lower.includes("branch already linked to another distributor")) {
    return CLIENT_REASSIGNMENT_MODAL.message;
  }
  if (lower.includes("administrator reassignment")) {
    return CLIENT_REASSIGNMENT_MODAL.message;
  }
  if (lower.includes("not allowed to create client for this distributor")) {
    return "No puedes registrar clientes para otra distribuidora.";
  }
  if (
    lower.includes("binding property is null") ||
    lower.includes("completar el vínculo")
  ) {
    return "La sucursal ya existe; se reintentará completar el vínculo como cliente automáticamente.";
  }
  if (lower.includes("branch already linked")) {
    return CLIENT_REASSIGNMENT_MODAL.message;
  }
  if (lower.includes("ya está registrada") && lower.includes("sucursal")) {
    return message;
  }
  return message;
}

export function messageFromUnknownError(error: unknown): string {
  if (error instanceof ApiError) return mapCatalogApiMessage(error.message);
  if (error instanceof TypeError) return "No se pudo conectar con el servidor.";
  if (error instanceof Error && error.message.trim()) {
    return mapCatalogApiMessage(error.message);
  }
  return "Error desconocido.";
}

/** Mensaje legible para formularios de catálogo / alta de cliente (no ocultar Error.message). */
export function getCatalogErrorMessage(error: unknown): string {
  return messageFromUnknownError(error);
}
