import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type { EmployeeRequest } from "@/types/employee";
import type {
  ModificationRequestDetailResponse,
  ModificationRequestListItemResponse,
  ModificationRequestStatus,
} from "@/types/employee-modification-request";

const BASE = "/api/employee-modification-requests";

type RawModificationRequestDetailResponse = Omit<
  ModificationRequestDetailResponse,
  "proposedData"
> & {
  proposedData: unknown;
};

function normalizeProposedData(raw: unknown): Partial<EmployeeRequest> | null {
  if (raw == null) return null;

  let candidate: unknown = raw;
  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (candidate == null || typeof candidate !== "object") {
    return null;
  }

  const obj = candidate as Record<string, unknown>;
  const rawBranchId = obj.branchId ?? obj.branch_id ?? obj.id_sucursal;
  const branchId =
    rawBranchId == null || rawBranchId === ""
      ? undefined
      : Number(rawBranchId);

  return {
    nationalId: (obj.nationalId ?? obj.national_id ?? "") as string,
    name: (obj.name ?? obj.nombre ?? "") as string,
    phone: (obj.phone ?? obj.telefono ?? "") as string,
    email: (obj.email ?? obj.correo ?? "") as string,
    type: (obj.type ?? obj.tipo) as EmployeeRequest["type"],
    branchId: Number.isFinite(branchId) ? branchId : undefined,
  };
}

function normalizeDetail(
  raw: RawModificationRequestDetailResponse,
): ModificationRequestDetailResponse {
  const proposedData = normalizeProposedData(raw.proposedData);
  return {
    ...raw,
    proposedData,
  };
}

export async function fetchEmployeeModificationRequests(
  status: ModificationRequestStatus = "PENDING",
): Promise<ModificationRequestListItemResponse[]> {
  return apiFetch<ModificationRequestListItemResponse[]>(
    `${BASE}?status=${encodeURIComponent(status)}`,
  );
}

export async function fetchEmployeeModificationRequestById(
  id: number,
): Promise<ModificationRequestDetailResponse> {
  const raw = await apiFetch<RawModificationRequestDetailResponse>(`${BASE}/${id}`);
  return normalizeDetail(raw);
}

export async function approveEmployeeModificationRequest(
  id: number,
): Promise<ModificationRequestDetailResponse> {
  const raw = await apiFetch<RawModificationRequestDetailResponse>(
    `${BASE}/${id}/approve`,
    {
    method: "POST",
    },
  );
  return normalizeDetail(raw);
}

export async function rejectEmployeeModificationRequest(
  id: number,
): Promise<ModificationRequestDetailResponse> {
  const raw = await apiFetch<RawModificationRequestDetailResponse>(
    `${BASE}/${id}/reject`,
    {
    method: "POST",
    },
  );
  return normalizeDetail(raw);
}

export function getEmployeeModificationRequestsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "Solicitud no encontrada.";
    if (error.status === 403) return "No tienes permisos para esta operación.";
    return error.message;
  }
  if (error instanceof TypeError) return "No se pudo conectar con el servidor.";
  return "Ha ocurrido un error inesperado.";
}
