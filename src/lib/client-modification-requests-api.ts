import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  ClientModificationProposedData,
  ClientModificationRequestDetailResponse,
  ClientModificationRequestListItemResponse,
  ModificationRequestStatus,
} from "@/types/client-modification-request";

const BASE = "/api/client-modification-requests";

type RawClientModificationRequestDetailResponse = Omit<
  ClientModificationRequestDetailResponse,
  "proposedData" | "currentClientSnapshot"
> & {
  proposedData?: unknown;
  proposed_data?: unknown;
  currentClientSnapshot?: ClientModificationRequestDetailResponse["currentClientSnapshot"];
  current_client_snapshot?: ClientModificationRequestDetailResponse["currentClientSnapshot"];
};

function unwrapJsonValue(raw: unknown): unknown {
  let candidate = raw;
  for (let depth = 0; depth < 4; depth += 1) {
    if (candidate == null) return null;
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (!trimmed) return null;
      try {
        candidate = JSON.parse(trimmed);
        continue;
      } catch {
        return null;
      }
    }
    if (typeof candidate === "object" && !Array.isArray(candidate)) {
      const obj = candidate as Record<string, unknown>;
      const nested = obj.proposedData ?? obj.proposed_data;
      if (nested != null && nested !== candidate) {
        candidate = nested;
        continue;
      }
    }
    break;
  }
  return candidate;
}

function normalizeProposedData(
  raw: unknown,
): Partial<ClientModificationProposedData> | null {
  const candidate = unwrapJsonValue(raw);
  if (candidate == null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }
  const obj = candidate as Record<string, unknown>;
  return {
    businessName:
      typeof obj.businessName === "string" ? obj.businessName : undefined,
    rif: typeof obj.rif === "string" ? obj.rif : undefined,
    contributorType:
      typeof obj.contributorType === "string"
        ? (obj.contributorType as ClientModificationProposedData["contributorType"])
        : undefined,
    city: typeof obj.city === "string" ? obj.city : undefined,
    state: typeof obj.state === "string" ? obj.state : undefined,
    address: typeof obj.address === "string" ? obj.address : undefined,
    contactPersonName:
      typeof obj.contactPersonName === "string"
        ? obj.contactPersonName
        : undefined,
    phone: typeof obj.phone === "string" ? obj.phone : undefined,
    email: typeof obj.email === "string" ? obj.email : undefined,
    distributorId:
      typeof obj.distributorId === "number"
        ? obj.distributorId
        : typeof obj.distributorId === "string" && obj.distributorId.trim()
          ? Number(obj.distributorId)
          : undefined,
  };
}

function normalizeDetail(
  raw: RawClientModificationRequestDetailResponse,
): ClientModificationRequestDetailResponse {
  return {
    id: raw.id,
    clientId: raw.clientId,
    actionType: raw.actionType,
    status: raw.status,
    proposedData: normalizeProposedData(raw.proposedData ?? raw.proposed_data),
    currentClientSnapshot:
      raw.currentClientSnapshot ?? raw.current_client_snapshot ?? null,
    requestedById: raw.requestedById,
    requestedByName: raw.requestedByName,
    createdAt: raw.createdAt,
  };
}

export async function fetchClientModificationRequests(
  status: ModificationRequestStatus = "PENDING",
): Promise<ClientModificationRequestListItemResponse[]> {
  return apiFetch<ClientModificationRequestListItemResponse[]>(
    `${BASE}?status=${encodeURIComponent(status)}`,
  );
}

export async function fetchClientModificationRequestById(
  id: number,
): Promise<ClientModificationRequestDetailResponse> {
  const raw = await apiFetch<RawClientModificationRequestDetailResponse>(
    `${BASE}/${id}`,
  );
  return normalizeDetail(raw);
}

export async function approveClientModificationRequest(
  id: number,
): Promise<ClientModificationRequestDetailResponse> {
  const raw = await apiFetch<RawClientModificationRequestDetailResponse>(
    `${BASE}/${id}/approve`,
    {
      method: "POST",
    },
  );
  return normalizeDetail(raw);
}

export async function rejectClientModificationRequest(
  id: number,
): Promise<ClientModificationRequestDetailResponse> {
  const raw = await apiFetch<RawClientModificationRequestDetailResponse>(
    `${BASE}/${id}/reject`,
    {
      method: "POST",
    },
  );
  return normalizeDetail(raw);
}

export function getClientModificationRequestsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "Solicitud no encontrada.";
    if (error.status === 403) return "No tienes permisos para esta operación.";
    return error.message;
  }
  if (error instanceof TypeError) return "No se pudo conectar con el servidor.";
  return "Ha ocurrido un error inesperado.";
}
