import { fetchAnnualInspections } from "@/lib/annual-inspections-api";
import { fetchBranches } from "@/lib/branches-api";
import { fetchCompanies } from "@/lib/companies-api";
import type { CompanyScope } from "@/lib/company-scope";
import { contractStatus } from "@/lib/contract-form";
import { formatRelativeTime } from "@/lib/dashboard-data";
import { fetchDistributorContracts } from "@/lib/distributor-contracts-api";
import { fetchEmployees } from "@/lib/employees-api";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import { PRINTER_STATUS_LABELS } from "@/lib/printer-form";
import { fetchPrinters } from "@/lib/printers-api";
import {
  branchIdsFromScope,
  filterAnnualInspectionsInScope,
  filterEmployeesInScope,
  filterPrintersForUser,
  filterSealsByPrinterScope,
  filterTechnicalServicesInScope,
} from "@/lib/scope-filters";
import { fetchSeals } from "@/lib/seals-api";
import { fetchServiceCenterContracts } from "@/lib/service-center-contracts-api";
import { fetchTechnicalServices } from "@/lib/technical-services-api";
import type { AppNotification, NotificationKind } from "@/types/notification";
import type { Role } from "@/types/user";

const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 50;

async function settled<T>(
  promise: Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await promise };
  } catch {
    return { ok: false };
  }
}

function isRecent(iso: string): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= MAX_AGE_MS;
}

function pushNotification(
  list: AppNotification[],
  input: Omit<AppNotification, "sortKey"> & { sortKey?: number },
): void {
  const sortKey = input.sortKey ?? new Date(input.createdAt).getTime();
  if (!sortKey || Number.isNaN(sortKey) || !isRecent(input.createdAt)) return;
  list.push({ ...input, sortKey });
}

const FIRST_VISIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function withReadState(
  items: AppNotification[],
  prefs: {
    readIds: Set<string>;
    dismissedIds: Set<string>;
    lastSeenAt: string | null;
  },
): (AppNotification & { read: boolean })[] {
  const lastSeenMs = prefs.lastSeenAt
    ? new Date(prefs.lastSeenAt).getTime()
    : Date.now() - FIRST_VISIT_WINDOW_MS;

  return items
    .filter((n) => !prefs.dismissedIds.has(n.id))
    .map((n) => {
      const explicitlyRead = prefs.readIds.has(n.id);
      const seenByVisit = n.sortKey <= lastSeenMs;
      return {
        ...n,
        read: explicitlyRead || seenByVisit,
      };
    });
}

export function toDisplayTime(iso: string): string {
  return formatRelativeTime(iso);
}

export async function loadNotifications(options: {
  role: Role;
  username: string;
  scope: CompanyScope | null;
  distributorId: number | null;
  userBranchId: number | null;
}): Promise<{ notifications: AppNotification[]; warnings: string[] }> {
  const { role, scope, distributorId, userBranchId } = options;
  const warnings: string[] = [];
  const items: AppNotification[] = [];

  const canPrinters =
    role === "ADMIN" || role === "DISTRIBUTOR" || role === "TECHNICIAN";
  const canFieldOps =
    role === "ADMIN" || role === "TECHNICIAN" || role === "SERVICE_CENTER";
  const isAdmin = role === "ADMIN";

  const [
    companiesP,
    branchesP,
    employeesP,
    printersP,
    sealsP,
    servicesP,
    inspectionsP,
    modelsP,
    contractsP,
  ] = await Promise.all([
    settled(scope ? Promise.resolve(scope.companies) : fetchCompanies()),
    settled(scope ? Promise.resolve(scope.branches) : fetchBranches()),
    settled(fetchEmployees()),
    canPrinters ? settled(fetchPrinters()) : Promise.resolve(null),
    canFieldOps ? settled(fetchSeals()) : Promise.resolve(null),
    canFieldOps ? settled(fetchTechnicalServices()) : Promise.resolve(null),
    canFieldOps ? settled(fetchAnnualInspections()) : Promise.resolve(null),
    isAdmin ? settled(fetchPrinterModels()) : Promise.resolve(null),
    isAdmin
      ? settled(
          Promise.all([
            fetchDistributorContracts(),
            fetchServiceCenterContracts(),
          ]),
        )
      : Promise.resolve(null),
  ]);

  const branches = branchesP.ok ? branchesP.value : [];
  const branchIds = branchIdsFromScope(scope, branches);
  const companyIds = scope?.companyIds ?? new Set((companiesP.ok ? companiesP.value : []).map((c) => c.id));
  const scopedBranches =
    branchIds.size > 0
      ? branches.filter((b) => branchIds.has(b.id))
      : branches;

  if (companiesP.ok) {
    for (const c of companiesP.value) {
      pushNotification(items, {
        id: `company-${c.id}`,
        kind: "company",
        title: "Nueva empresa",
        message: `${c.businessName} (${c.rif}) añadida al catálogo.`,
        href: "/companies",
        createdAt: c.createdAt,
      });
    }
  }

  for (const b of scopedBranches) {
    const label = b.city?.trim() || b.address?.trim() || `sucursal ${b.id}`;
    pushNotification(items, {
      id: `branch-${b.id}`,
      kind: "branch",
      title: "Nueva sucursal",
      message: `Sucursal registrada en ${label}.`,
      href: "/branches",
      createdAt: b.createdAt,
    });
  }

  if (employeesP.ok) {
    const employees = filterEmployeesInScope(
      employeesP.value,
      companyIds,
      role,
      userBranchId,
      branches,
    );
    for (const e of employees) {
      pushNotification(items, {
        id: `employee-${e.id}`,
        kind: "employee",
        title: "Nuevo empleado",
        message: `${e.name} añadido al personal.`,
        href: "/employees",
        createdAt: e.createdAt,
      });
    }
  } else {
    warnings.push("No se pudieron cargar empleados para notificaciones.");
  }

  if (printersP?.ok) {
    const printers = filterPrintersForUser(printersP.value, role, distributorId);
    for (const p of printers) {
      const statusLabel = PRINTER_STATUS_LABELS[p.status];
      pushNotification(items, {
        id: `printer-${p.id}`,
        kind: "printer",
        title: "Nueva impresora",
        message: `Serial ${p.fiscalSerial} registrada (${statusLabel}).`,
        href: "/printers",
        createdAt: p.createdAt,
      });
    }
  } else if (canPrinters && printersP && !printersP.ok) {
    warnings.push("No se pudieron cargar impresoras para notificaciones.");
  }

  const printerIds = printersP?.ok
    ? new Set(
        filterPrintersForUser(printersP.value, role, distributorId).map(
          (p) => p.id,
        ),
      )
    : new Set<number>();

  const employeeIds = employeesP.ok
    ? new Set(
        filterEmployeesInScope(
          employeesP.value,
          companyIds,
          role,
          userBranchId,
          branches,
        ).map((e) => e.id),
      )
    : new Set<number>();

  if (sealsP?.ok) {
    const scoped = filterSealsByPrinterScope(sealsP.value, printerIds, role);
    for (const s of scoped) {
      pushNotification(items, {
        id: `seal-${s.id}`,
        kind: "seal",
        title: "Nuevo precinto",
        message: `Precinto ${s.serial} registrado en inventario.`,
        href: "/seals",
        createdAt: s.createdAt,
      });
    }
  }

  if (servicesP?.ok) {
    const scoped = filterTechnicalServicesInScope(
      servicesP.value,
      printerIds,
      role,
      distributorId,
    );
    for (const s of scoped) {
      pushNotification(items, {
        id: `technical-service-${s.id}`,
        kind: "technical_service",
        title: "Servicio técnico",
        message: s.reportedFailure?.trim()
          ? `Visita: ${s.reportedFailure.trim()}`
          : "Nueva visita de servicio registrada.",
        href: "/technical-services",
        createdAt: s.createdAt,
      });
    }
  }

  if (inspectionsP?.ok) {
    const scoped = filterAnnualInspectionsInScope(
      inspectionsP.value,
      printerIds,
      employeeIds,
      role,
    );
    for (const i of scoped) {
      pushNotification(items, {
        id: `annual-inspection-${i.id}`,
        kind: "annual_inspection",
        title: "Inspección anual",
        message: "Nueva inspección anual registrada.",
        href: "/annual-inspections",
        createdAt: i.createdAt,
      });
    }
  }

  if (modelsP?.ok) {
    for (const m of modelsP.value) {
      pushNotification(items, {
        id: `printer-model-${m.id}`,
        kind: "printer_model",
        title: "Modelo fiscal",
        message: `Modelo ${m.brand} ${m.modelCode} añadido al catálogo.`,
        href: "/printer-models",
        createdAt: m.createdAt,
      });
    }
  }

  if (contractsP?.ok) {
    const [distributorContracts, serviceCenterContracts] = contractsP.value;
    for (const c of distributorContracts) {
      const status = contractStatus(c.startDate, c.endDate);
      pushNotification(items, {
        id: `distributor-contract-${c.id}`,
        kind: "contract",
        title: "Contrato de distribuidora",
        message: `Contrato ${c.id} (${status === "active" ? "vigente" : status}).`,
        href: "/contracts",
        createdAt: c.createdAt,
      });
    }
    for (const c of serviceCenterContracts) {
      const status = contractStatus(c.startDate, c.endDate);
      pushNotification(items, {
        id: `service-center-contract-${c.id}`,
        kind: "contract",
        title: "Contrato de centro de servicio",
        message: `Contrato ${c.id} (${status === "active" ? "vigente" : status}).`,
        href: "/contracts",
        createdAt: c.createdAt,
      });
    }
  }

  const notifications = items
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, MAX_ITEMS);

  return { notifications, warnings };
}

export function notificationKindLabel(kind: NotificationKind): string {
  const labels: Record<NotificationKind, string> = {
    printer: "Impresora",
    company: "Empresa",
    branch: "Sucursal",
    employee: "Empleado",
    seal: "Precinto",
    technical_service: "Servicio técnico",
    annual_inspection: "Inspección",
    contract: "Contrato",
    printer_model: "Modelo",
    system: "Sistema",
  };
  return labels[kind];
}
