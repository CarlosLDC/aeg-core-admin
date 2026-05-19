import { ApiError } from "@/types/auth";

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
    return "Esta sucursal ya es cliente de otra distribuidora.";
  }
  if (lower.includes("not allowed to create client for this distributor")) {
    return "No puedes registrar clientes para otra distribuidora.";
  }
  if (lower.includes("binding property is null")) {
    return "Esta sucursal ya está registrada. Si el alta se interrumpió, intenta de nuevo: se completará el vínculo como cliente.";
  }
  if (lower.includes("branch already linked")) {
    return "Esta sucursal ya es cliente de otra distribuidora.";
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
