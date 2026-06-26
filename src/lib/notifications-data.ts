import { fetchAnnualInspections } from "@/lib/annual-inspections-api";
import { fetchBranches } from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import { fetchCompanies } from "@/lib/companies-api";
import type { CompanyScope } from "@/lib/company-scope";
import { contractStatus } from "@/lib/contract-form";
import { can } from "@/lib/permissions/can";
import { formatRelativeTime } from "@/lib/dashboard-data";
import { fetchDistributorContracts } from "@/lib/distributor-contracts-api";
import { fetchUsers } from "@/lib/users-api";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import { printerStatusLabel } from "@/lib/printer-status";
import { fetchPrinters } from "@/lib/printers-api";
import {
  branchIdsFromScope,
  filterAnnualInspectionsInScope,
  filterTechnicianUsersInScope,
  filterPrintersForUser,
  filterSealsByPrinterScope,
  filterTechnicalServicesInScope,
} from "@/lib/scope-filters";
import { fetchSeals } from "@/lib/seals-api";
import { fetchServiceCenterContracts } from "@/lib/service-center-contracts-api";
import { fetchTechnicalServices } from "@/lib/technical-services-api";
import {
  notificationHrefForBranch,
  notificationHrefForCompany,
  resolveNotificationHref,
} from "@/lib/notification-hrefs";
import {
  annualInspectionPath,
  distributorContractPath,
  printerModelPath,
  printerPath,
  sealPath,
  serviceCenterContractPath,
  technicalServicePath,
} from "@/lib/resource-routes";
import type { ClientResponse } from "@/types/branch-role";
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

  const canPrinters = role === "ADMIN" || role === "TECHNICIAN";
  const canSeals = can(role, "seals", "read");
  const canTechnicalServices = can(role, "technicalServices", "read");
  const canAnnualInspections = can(role, "annualInspections", "read");
  const isAdmin = role === "ADMIN";
  const canLoadUsers = can(role, "users", "read");

  const [
    companiesP,
    branchesP,
    clientsP,
    technicianUsersP,
    printersP,
    sealsP,
    servicesP,
    inspectionsP,
    modelsP,
    contractsP,
  ] = await Promise.all([
    settled(scope ? Promise.resolve(scope.companies) : fetchCompanies()),
    settled(scope ? Promise.resolve(scope.branches) : fetchBranches()),
    role === "TECHNICIAN" ? settled(fetchClients()) : Promise.resolve(null),
    canLoadUsers ? settled(fetchUsers()) : Promise.resolve(null),
    canPrinters ? settled(fetchPrinters()) : Promise.resolve(null),
    canSeals ? settled(fetchSeals()) : Promise.resolve(null),
    canTechnicalServices ? settled(fetchTechnicalServices()) : Promise.resolve(null),
    canAnnualInspections
      ? settled(fetchAnnualInspections())
      : Promise.resolve(null),
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
  const clients: ClientResponse[] = clientsP?.ok ? clientsP.value : [];

  if (companiesP.ok) {
    for (const c of companiesP.value) {
      pushNotification(items, {
        id: `company-${c.id}`,
        kind: "company",
        title: "Nueva empresa",
        message: `${c.businessName} (${c.rif}) añadida al catálogo.`,
        href: notificationHrefForCompany(
          c.id,
          role,
          scopedBranches,
          clients,
        ),
        createdAt: c.createdAt,
      });
    }
  }

  for (const b of scopedBranches) {
    const label = b.city?.trim() || b.address?.trim() || `empresa ${b.id}`;
    pushNotification(items, {
      id: `branch-${b.id}`,
      kind: "branch",
      title: "Nueva empresa",
      message: `Empresa registrada en ${label}.`,
      href: notificationHrefForBranch(b, role, clients),
      createdAt: b.createdAt,
    });
  }

  if (printersP?.ok) {
    const printers = filterPrintersForUser(printersP.value, role, distributorId);
    for (const p of printers) {
      const statusLabel = printerStatusLabel(p.status);
      pushNotification(items, {
        id: `printer-${p.id}`,
        kind: "printer",
        title: "Nueva impresora",
        message: `Serial ${p.fiscalSerial} registrada (${statusLabel}).`,
        href: resolveNotificationHref(role, printerPath(p.id)),
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

  if (sealsP?.ok) {
    const scoped = filterSealsByPrinterScope(sealsP.value, printerIds, role);
    for (const s of scoped) {
      pushNotification(items, {
        id: `seal-${s.id}`,
        kind: "seal",
        title: "Nuevo precinto",
        message: `Precinto ${s.serial} registrado en inventario.`,
        href: resolveNotificationHref(role, sealPath(s.id)),
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
        href: resolveNotificationHref(role, technicalServicePath(s.id)),
        createdAt: s.createdAt,
      });
    }
  }

  if (inspectionsP?.ok) {
    const technicianUserIds = technicianUsersP?.ok
      ? new Set(
          filterTechnicianUsersInScope(
            technicianUsersP.value,
            role,
            distributorId,
          ).map((user) => user.id),
        )
      : new Set<number>();
    const scoped = filterAnnualInspectionsInScope(
      inspectionsP.value,
      printerIds,
      technicianUserIds,
      role,
    );
    for (const i of scoped) {
      pushNotification(items, {
        id: `annual-inspection-${i.id}`,
        kind: "annual_inspection",
        title: "Inspección anual",
        message: "Nueva inspección anual registrada.",
        href: resolveNotificationHref(role, annualInspectionPath(i.id)),
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
        href: resolveNotificationHref(role, printerModelPath(m.id)),
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
        href: resolveNotificationHref(role, distributorContractPath(c.id)),
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
        href: resolveNotificationHref(role, serviceCenterContractPath(c.id)),
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
    branch: "Empresa",
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
