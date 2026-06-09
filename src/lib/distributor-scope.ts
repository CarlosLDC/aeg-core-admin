import { fetchBranchById } from "@/lib/branches-api";
import { fetchDistributorById } from "@/lib/distributors-api";
import type { BranchResponse } from "@/types/branch";
import type {
  ClientResponse,
  DistributorResponse,
} from "@/types/branch-role";
import type { EmployeeResponse } from "@/types/employee";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse } from "@/types/printer";
import type { Role } from "@/types/user";

export const DISTRIBUTOR_SELF_CLIENT_MESSAGE =
  "No puedes registrar ni usar tu propia distribuidora como cliente.";

/** Sucursal en catálogo sin vínculo activo (p. ej. cliente eliminado por el admin). */
export const CLIENT_RE_REGISTRATION_FORBIDDEN_MESSAGE =
  "Ya existe una sucursal registrada para esta empresa en esta ubicación. " +
  "Si el cliente fue eliminado, no es posible darlo de alta de nuevo. " +
  "Contacte al administrador.";

export function resolveDistributorStaffBranchId(
  distributors: DistributorResponse[],
  distributorId: number | null,
): number | null {
  if (distributorId == null) return null;
  return distributors.find((d) => d.id === distributorId)?.branchId ?? null;
}

export function excludeDistributorSelfClients<T extends { branchId: number }>(
  clients: T[],
  staffBranchId: number | null,
): T[] {
  if (staffBranchId == null) return clients;
  return clients.filter((client) => client.branchId !== staffBranchId);
}

export function isDistributorSelfClient(
  clientId: number,
  clients: ClientResponse[],
  staffBranchId: number | null,
): boolean {
  if (staffBranchId == null) return false;
  const client = clients.find((row) => row.id === clientId);
  return client != null && client.branchId === staffBranchId;
}

/** Sucursal de la distribuidora (personal interno), no sucursales de clientes. */
export async function loadDistributorStaffBranches(
  distributorId: number,
): Promise<BranchResponse[]> {
  const distributor = await fetchDistributorById(distributorId);
  const branch = await fetchBranchById(distributor.branchId);
  return [branch];
}

/** Sucursal(es) donde opera la distribuidora (personal propio), no sucursales de clientes. */
export function distributorStaffBranchIds(
  distributors: DistributorResponse[],
  distributorId: number | null,
): Set<number> {
  if (distributorId == null) return new Set();
  const row = distributors.find((d) => d.id === distributorId);
  if (!row) return new Set();
  return new Set([row.branchId]);
}

export function filterEmployeesForDistributorStaff(
  employees: EmployeeResponse[],
  role: Role,
  distributorStaffBranchIds: Set<number>,
): EmployeeResponse[] {
  if (role !== "DISTRIBUTOR") return employees;
  if (distributorStaffBranchIds.size === 0) return [];
  return employees.filter(
    (e) => e.branchId != null && distributorStaffBranchIds.has(e.branchId),
  );
}

/** Modelos referenciados por las impresoras del distribuidor (no el catálogo completo). */
export function filterPrinterModelsForDistributor(
  models: PrinterModelResponse[],
  printers: PrinterResponse[],
): PrinterModelResponse[] {
  const modelIds = new Set(printers.map((p) => p.modelId));
  return models.filter((m) => modelIds.has(m.id));
}
