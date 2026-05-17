import { resolveApiBaseUrl } from "@/lib/api-config";
import { getStoredToken } from "@/lib/auth-storage";
import { redirectToLoginAfterExpired } from "@/lib/session-expired";
import { ApiError } from "@/types/auth";

export function getApiBaseUrl(): string {
  const base = resolveApiBaseUrl();
  if (base === null) {
    throw new Error(
      "NEXT_PUBLIC_API_URL no está configurada. En desarrollo local usa http://localhost:8080.",
    );
  }
  return base;
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { auth = true, headers, ...init } = options;
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has("Content-Type") && init.body) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getStoredToken();
    if (!token) {
      throw new ApiError("No hay sesión activa", 401);
    }
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers: requestHeaders,
    credentials: "omit",
  });

  if (response.status === 401 && auth) {
    redirectToLoginAfterExpired();
    throw new ApiError("Sesión expirada o no válida", 401);
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  return undefined as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as {
      message?: string;
      error?: string;
    };
    return data.message ?? data.error ?? response.statusText;
  } catch {
    return response.statusText || "Error en la petición";
  }
}
