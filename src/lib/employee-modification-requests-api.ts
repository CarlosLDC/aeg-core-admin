import { apiFetch } from "@/lib/api";
import { ApiError } from "@/types/auth";
import type {
  EmployeeModificationProposedData,
  ModificationRequestDetailResponse,
  ModificationRequestListItemResponse,
  ModificationRequestStatus,
} from "@/types/employee-modification-request";

const BASE = "/api/employee-modification-requests";

type RawModificationRequestDetailResponse = Omit<
  ModificationRequestDetailResponse,
  "proposedData" | "currentEmployeeSnapshot"
> & {
  proposedData?: unknown;
  proposed_data?: unknown;
  currentEmployeeSnapshot?: ModificationRequestDetailResponse["currentEmployeeSnapshot"];
  current_employee_snapshot?: ModificationRequestDetailResponse["currentEmployeeSnapshot"];
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
): Partial<EmployeeModificationProposedData> | null {
  const candidate = unwrapJsonValue(raw);
  if (candidate == null || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  const obj = candidate as Record<string, unknown>;
  const rawCompanyId = obj.companyId ?? obj.company_id ?? obj.id_empresa;
  const companyId =
    rawCompanyId == null || rawCompanyId === ""
      ? undefined
      : Number(rawCompanyId);

  const isTechnician = obj.isTechnician ?? obj.is_technician;
  const isDistributorPerson = obj.isDistributorPerson ?? obj.is_distributor_person;

  const nationalId = String(obj.nationalId ?? obj.national_id ?? "").trim();
  const name = String(obj.name ?? obj.nombre ?? "").trim();
  const phone = String(obj.phone ?? obj.telefono ?? "").trim();
  const email = String(obj.email ?? obj.correo ?? "").trim();
  const type = (obj.type ?? obj.tipo) as EmployeeModificationProposedData["type"];

  if (!nationalId && !name && !phone && !email && type == null && companyId == null) {
    return null;
  }

  return {
    nationalId: nationalId || undefined,
    name: name || undefined,
    phone: phone || undefined,
    email: email || undefined,
    type,
    companyId: Number.isFinite(companyId) ? companyId : undefined,
    isTechnician:
      typeof isTechnician === "boolean"
        ? isTechnician
        : isTechnician === "true"
          ? true
          : isTechnician === "false"
            ? false
            : undefined,
    isDistributorPerson:
      typeof isDistributorPerson === "boolean"
        ? isDistributorPerson
        : isDistributorPerson === "true"
          ? true
          : isDistributorPerson === "false"
            ? false
            : undefined,
  };
}

function normalizeSnapshot(
  raw: RawModificationRequestDetailResponse,
): ModificationRequestDetailResponse["currentEmployeeSnapshot"] {
  const snapshot = raw.currentEmployeeSnapshot ?? raw.current_employee_snapshot;
  if (!snapshot) return null;

  return {
    ...snapshot,
    companyId:
      snapshot.companyId ??
      (snapshot as { company_id?: number }).company_id ??
      0,
    isTechnician: snapshot.isTechnician ?? false,
    isDistributorPerson: snapshot.isDistributorPerson ?? false,
  };
}

function normalizeDetail(
  raw: RawModificationRequestDetailResponse,
): ModificationRequestDetailResponse {
  const proposedData = normalizeProposedData(raw.proposedData ?? raw.proposed_data);
  return {
    id: raw.id,
    employeeId: raw.employeeId,
    actionType: raw.actionType,
    status: raw.status,
    proposedData,
    currentEmployeeSnapshot: normalizeSnapshot(raw),
    requestedById: raw.requestedById,
    requestedByName: raw.requestedByName,
    createdAt: raw.createdAt,
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
