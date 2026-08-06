import { apiFetch, getApiBaseUrl } from "@/lib/api";
import { getStoredToken } from "@/lib/auth-storage";
import { redirectToLoginAfterExpired } from "@/lib/session-expired";
import { readErrorMessageFromResponse } from "@/lib/api-error-message";
import { ApiError } from "@/types/auth";
import type {
  PrinterDispositionRequest,
  PrinterEnajenacionTicketResponse,
  PrinterRequest,
  PrinterResponse,
} from "@/types/printer";
import type {
  PrinterDeleteBlockedErrorBody,
  PrinterDeleteImpactResponse,
  PrinterDependencyRef,
} from "@/types/printer-dependencies";

const BASE = "/api/printers";

export type { PrinterDispositionRequest };

export class PrinterDeleteBlockedError extends Error {
  readonly status = 409;
  readonly dependencies: PrinterDependencyRef[];
  readonly consequences: string[];
  readonly forceAllowed: boolean;

  constructor(
    message: string,
    dependencies: PrinterDependencyRef[],
    consequences: string[] = [],
    forceAllowed = true,
  ) {
    super(message);
    this.name = "PrinterDeleteBlockedError";
    this.dependencies = dependencies;
    this.consequences = consequences;
    this.forceAllowed = forceAllowed;
  }
}

export function isPrinterDeleteBlockedError(
  error: unknown,
): error is PrinterDeleteBlockedError {
  return error instanceof PrinterDeleteBlockedError;
}

export async function fetchPrinters(): Promise<PrinterResponse[]> {
  return apiFetch<PrinterResponse[]>(BASE);
}

export async function fetchPrinterById(id: number): Promise<PrinterResponse> {
  return apiFetch<PrinterResponse>(`${BASE}/${id}`);
}

export async function createPrinter(
  body: PrinterRequest,
): Promise<PrinterResponse> {
  return apiFetch<PrinterResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updatePrinter(
  id: number,
  body: PrinterRequest,
): Promise<PrinterResponse> {
  return apiFetch<PrinterResponse>(`${BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function disposePrinter(
  id: number,
  body: PrinterDispositionRequest,
): Promise<PrinterResponse> {
  return apiFetch<PrinterResponse>(`${BASE}/${id}/enajenar`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchEnajenacionTicketPreview(
  printerId: number,
  clientId: number,
): Promise<PrinterEnajenacionTicketResponse> {
  return apiFetch<PrinterEnajenacionTicketResponse>(
    `${BASE}/${printerId}/enajenacion-ticket?clientId=${clientId}`,
  );
}

export async function fetchPrinterDeleteImpact(
  id: number,
): Promise<PrinterDeleteImpactResponse> {
  return apiFetch<PrinterDeleteImpactResponse>(`${BASE}/${id}/delete-impact`);
}

export async function deletePrinter(
  id: number,
  options?: { force?: boolean },
): Promise<void> {
  const token = getStoredToken();
  if (!token) {
    throw new ApiError("No hay sesión activa", 401);
  }

  const force = options?.force === true;
  const url = `${getApiBaseUrl()}${BASE}/${id}${force ? "?force=true" : ""}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "omit",
  });

  if (response.status === 401) {
    redirectToLoginAfterExpired();
    throw new ApiError("Sesión expirada o no válida", 401);
  }

  if (response.ok || response.status === 204) {
    return;
  }

  if (response.status === 409) {
    let body: PrinterDeleteBlockedErrorBody | null = null;
    try {
      body = (await response.json()) as PrinterDeleteBlockedErrorBody;
    } catch {
      body = null;
    }
    const dependencies = Array.isArray(body?.dependencies)
      ? body.dependencies.filter(
          (dep): dep is PrinterDependencyRef =>
            dep != null &&
            typeof dep === "object" &&
            typeof dep.id === "number" &&
            typeof dep.label === "string",
        )
      : [];
    const consequences = Array.isArray(body?.consequences)
      ? body.consequences.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : [];
    if (dependencies.length > 0) {
      throw new PrinterDeleteBlockedError(
        body?.message?.trim() ||
          "Esta impresora tiene registros vinculados.",
        dependencies,
        consequences,
        body?.forceAllowed !== false,
      );
    }
  }

  throw new ApiError(
    await readErrorMessageFromResponse(response),
    response.status,
  );
}

export function getPrintersErrorMessage(error: unknown): string {
  if (error instanceof PrinterDeleteBlockedError) {
    return error.message;
  }
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return (
        error.message ||
        "No tienes permiso para ver o modificar esta impresora."
      );
    }
    if (error.status === 404) return "Impresora no encontrada.";
    if (error.status === 409) {
      return (
        error.message ||
        "No se puede eliminar la impresora porque tiene registros vinculados."
      );
    }
    if (error.status === 400) {
      return error.message || "Datos de impresora no válidos.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "No se pudo conectar con el servidor.";
  }
  return "Ha ocurrido un error inesperado.";
}
