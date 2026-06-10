import { contractStatus } from "@/lib/contract-form";
import { PRINTER_STATUS_LABELS } from "@/lib/printer-form";
import {
  isPrinterOperative,
  normalizePrinterStatus,
} from "@/lib/printer-status";
import { fetchBranches } from "@/lib/branches-api";
import { fetchCompanies } from "@/lib/companies-api";
import {
  loadCatalogRoles,
  type CatalogRolesSnapshot,
} from "@/lib/catalog-roles-cache";
import { fetchDistributorContracts } from "@/lib/distributor-contracts-api";
import { fetchEmployees } from "@/lib/employees-api";
import { fetchPrinters } from "@/lib/printers-api";
import { fetchServiceCenterContracts } from "@/lib/service-center-contracts-api";
import { fetchUsers } from "@/lib/users-api";
import type { CompanyScope } from "@/lib/company-scope";
import { can } from "@/lib/permissions/can";
import {
  branchIdsFromScope,
  filterByBranchScope,
  filterEmployeesInScope,
  filterPrintersForUser,
} from "@/lib/scope-filters";
import type { BranchResponse } from "@/types/branch";
import type { CompanyResponse } from "@/types/company";
import type { EmployeeResponse } from "@/types/employee";
import type { PrinterResponse, PrinterStatus } from "@/types/printer";
import type { Role } from "@/types/user";

export { filterPrintersForUser } from "@/lib/scope-filters";

export type DashboardStat = {
  title: string;
  value: string;
  hint?: string;
  href?: string;
};

const STAT_HREFS: Record<string, string> = {
  Empresas: "/branches",
  Impresoras: "/printers",
  Empleados: "/employees",
  Clientes: "/clients",
  Distribuidores: "/branches",
  "Centros de servicio": "/branches",
};

function withStatHref(stat: DashboardStat): DashboardStat {
  const href = STAT_HREFS[stat.title];
  return href ? { ...stat, href } : stat;
}

export type DashboardActivity = {
  id: string;
  label: string;
  time: string;
  sortKey: number;
};

export type PrinterStatusCount = {
  status: PrinterStatus;
  label: string;
  count: number;
};

export type MonthlyCount = {
  key: string;
  label: string;
  count: number;
};

export type MonthlyStatusMix = {
  key: string;
  label: string;
  asignada: number;
  enajenada: number;
};

export type MonthlySalesBucket = {
  key: string;
  label: string;
  shortLabel: string;
  count: number;
  revenue: number;
};

const DISTRIBUTOR_PRINTER_STATUSES = ["asignada", "enajenada"] as const;

export type DashboardSnapshot = {
  stats: DashboardStat[];
  printers: PrinterResponse[];
  printerStatusCounts: PrinterStatusCount[];
  monthlyPrinterRegistrations: MonthlyCount[];
  /** Solo distribuidor: altas mensuales desglosadas por estatus de inventario. */
  monthlyStatusMix?: MonthlyStatusMix[];
  /** Solo distribuidor: enajenaciones por mes. */
  monthlySales?: MonthlySalesBucket[];
  recentPrinters: PrinterResponse[];
  activity: DashboardActivity[];
  loadWarnings: string[];
};

async function settled<T>(
  promise: Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error };
  }
}

const ALL_PRINTER_STATUSES = [
  "de_fabrica",
  "sin_asignar",
  "asignada",
  "enajenada",
  "desincorporada",
  "laboratorio",
] as const;

export function countPrintersByStatus(
  printers: PrinterResponse[],
  role: Role = "ADMIN",
): PrinterStatusCount[] {
  const counts = new Map<PrinterStatus, number>();
  for (const printer of printers) {
    const status = normalizePrinterStatus(printer.status);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  const statuses =
    role === "DISTRIBUTOR" ? DISTRIBUTOR_PRINTER_STATUSES : ALL_PRINTER_STATUSES;
  return statuses.map((status) => ({
    status,
    label: PRINTER_STATUS_LABELS[status],
    count: counts.get(status) ?? 0,
  }));
}

export function printersStatusMixByMonth(
  printers: PrinterResponse[],
  months = 6,
): MonthlyStatusMix[] {
  const now = new Date();
  const buckets: MonthlyStatusMix[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es", { month: "short" });
    buckets.push({ key, label, asignada: 0, enajenada: 0 });
  }
  const bucketMap = new Map(buckets.map((b) => [b.key, b]));
  for (const printer of printers) {
    if (
      printer.status !== "asignada" &&
      printer.status !== "enajenada"
    ) {
      continue;
    }
    const created = new Date(printer.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    const bucket = bucketMap.get(key);
    if (!bucket) continue;
    if (printer.status === "asignada") bucket.asignada += 1;
    else bucket.enajenada += 1;
  }
  return buckets;
}

export function distributorSalesByMonth(
  printers: PrinterResponse[],
  months = 12,
): MonthlySalesBucket[] {
  const now = new Date();
  const buckets: MonthlySalesBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es", { month: "short" });
    const shortLabel = d.toLocaleDateString("es", {
      month: "short",
      year: "2-digit",
    });
    buckets.push({ key, label, shortLabel, count: 0, revenue: 0 });
  }
  const bucketMap = new Map(buckets.map((b) => [b.key, b]));
  for (const printer of printers) {
    if (normalizePrinterStatus(printer.status) !== "enajenada") continue;
    const soldAt = new Date(printer.installationDate ?? printer.createdAt);
    if (Number.isNaN(soldAt.getTime())) continue;
    const key = `${soldAt.getFullYear()}-${String(soldAt.getMonth() + 1).padStart(2, "0")}`;
    const bucket = bucketMap.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.revenue += printer.finalSalePrice ?? 0;
  }
  return buckets;
}

export function printersByMonth(
  printers: PrinterResponse[],
  months = 6,
): MonthlyCount[] {
  const now = new Date();
  const buckets: MonthlyCount[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es", { month: "short" });
    buckets.push({ key, label, count: 0 });
  }
  const bucketMap = new Map(buckets.map((b) => [b.key, b]));
  for (const printer of printers) {
    const created = new Date(printer.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
    const bucket = bucketMap.get(key);
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Hace un momento";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} d`;
  return date.toLocaleDateString("es", { dateStyle: "medium" });
}

export function companiesStatHint(
  companies: CompanyResponse[],
  branches: BranchResponse[],
): string {
  const withBranchIds = new Set(branches.map((b) => b.companyId));
  const withBranch = companies.filter((c) => withBranchIds.has(c.id)).length;
  const withoutBranch = companies.length - withBranch;
  return `${withBranch} activas en red · ${withoutBranch} pendientes de alta`;
}

export function branchesStatHint(
  _branches: BranchResponse[],
  network: {
    clients: number;
    distributors: number;
    serviceCenters: number;
  },
): string {
  const n = (count: number, singular: string, plural: string) =>
    `${count} ${count === 1 ? singular : plural}`;
  return [
    n(network.clients, "cliente", "clientes"),
    n(network.distributors, "distribuidora", "distribuidoras"),
    n(network.serviceCenters, "centro", "centros"),
  ].join(" · ");
}

export function uniquePlaces(branches: BranchResponse[]): string {
  const cities = new Set(
    branches.map((b) => b.city?.trim()).filter((c): c is string => Boolean(c)),
  ).size;
  const states = new Set(
    branches.map((b) => b.state?.trim()).filter((s): s is string => Boolean(s)),
  ).size;
  return `${states} estados · ${cities} ciudades`;
}

function buildActivity(
  printers: PrinterResponse[],
  employees: EmployeeResponse[],
  branches: BranchResponse[],
): DashboardActivity[] {
  const items: DashboardActivity[] = [
    ...printers.map((p) => ({
      id: `printer-${p.id}`,
      label: `Impresora ${p.fiscalSerial} registrada`,
      time: formatRelativeTime(p.createdAt),
      sortKey: new Date(p.createdAt).getTime() || 0,
    })),
    ...employees.map((e) => ({
      id: `employee-${e.id}`,
      label: `Empleado ${e.name} añadido`,
      time: formatRelativeTime(e.createdAt),
      sortKey: new Date(e.createdAt).getTime() || 0,
    })),
    ...branches.map((b) => ({
      id: `branch-${b.id}`,
      label: `Empresa ${b.id} en ${b.city || "sin ciudad"}`,
      time: formatRelativeTime(b.createdAt),
      sortKey: new Date(b.createdAt).getTime() || 0,
    })),
  ];
  return items
    .filter((item) => item.sortKey > 0)
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, 8);
}

function buildStats(
  role: Role,
  counts: {
    companies: CompanyResponse[];
    branches: BranchResponse[];
    clients: number;
    distributors: number;
    serviceCenters: number;
    employees: number;
    printers: PrinterResponse[];
    users: number | null;
    activeContracts: number | null;
  },
): DashboardStat[] {
  const assignedPrinters = counts.printers.filter(
    (p) => p.status === "asignada",
  ).length;
  const disposedPrinters = counts.printers.filter(
    (p) => p.status === "enajenada",
  ).length;
  const activePrinters = counts.printers.filter((p) =>
    isPrinterOperative(p.status),
  ).length;
  const paidPrinters = counts.printers.filter((p) => p.paid).length;
  const branchHint = branchesStatHint(counts.branches, {
    clients: counts.clients,
    distributors: counts.distributors,
    serviceCenters: counts.serviceCenters,
  });
  const placesHint = uniquePlaces(counts.branches);

  switch (role) {
    case "ADMIN":
      return [
        {
          title: "Empresas",
          value: String(counts.branches.length),
          hint: branchHint,
        },
        {
          title: "Impresoras",
          value: String(counts.printers.length),
          hint: `${activePrinters} operativas · ${paidPrinters} pagadas`,
        },
        {
          title: "Empleados",
          value: String(counts.employees),
          hint: [
            counts.users != null ? `${counts.users} usuarios` : null,
            counts.activeContracts != null
              ? `${counts.activeContracts} contratos vigentes`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
        },
      ];
    case "DISTRIBUTOR":
      return [
        {
          title: "Impresoras",
          value: String(counts.printers.length),
          hint: `${assignedPrinters} asignadas · ${disposedPrinters} enajenadas`,
        },
        {
          title: "Clientes",
          value: String(counts.clients),
          hint: `${counts.branches.length} empresas en red`,
        },
        {
          title: "Empleados",
          value: String(counts.employees),
          hint: `${counts.companies.length} empresas vinculadas`,
        },
      ];
    case "TECHNICIAN":
      return [
        {
          title: "Impresoras",
          value: String(counts.printers.length),
          hint: `${activePrinters} operativas · ${counts.printers.filter((p) => p.status === "laboratorio").length} en laboratorio`,
        },
        {
          title: "Empleados",
          value: String(counts.employees),
          hint: `${counts.branches.length} empresas cubiertas`,
        },
        {
          title: "Empresas",
          value: String(counts.branches.length),
          hint: placesHint,
        },
        {
          title: "Distribuidores",
          value: String(counts.distributors),
          hint: `${counts.serviceCenters} centros de servicio`,
        },
      ];
    case "SERVICE_CENTER":
    default:
      return [
        {
          title: "Empresas",
          value: String(counts.branches.length),
          hint: branchHint,
        },
        {
          title: "Empleados",
          value: String(counts.employees),
          hint: placesHint,
        },
        {
          title: "Centros de servicio",
          value: String(counts.serviceCenters),
          hint: `${counts.clients} clientes en red`,
        },
      ];
  }
}

export async function loadDashboardSnapshot(options: {
  role: Role;
  scope: CompanyScope | null;
  catalogRoles?: CatalogRolesSnapshot | null;
  distributorId: number | null;
  userBranchId: number | null;
}): Promise<DashboardSnapshot> {
  const { role, scope, catalogRoles, distributorId, userBranchId } = options;
  const loadWarnings: string[] = [];

  const [
    companiesP,
    branchesP,
    clientsP,
    distributorsP,
    serviceCentersP,
    employeesP,
    printersP,
    usersP,
    contractsP,
  ] = await Promise.all([
    settled(scope ? Promise.resolve(scope.companies) : fetchCompanies()),
    settled(scope ? Promise.resolve(scope.branches) : fetchBranches()),
    settled(
      catalogRoles
        ? Promise.resolve(catalogRoles.clients)
        : loadCatalogRoles().then((r) => r.clients),
    ),
    settled(
      catalogRoles
        ? Promise.resolve(catalogRoles.distributors)
        : loadCatalogRoles().then((r) => r.distributors),
    ),
    settled(
      catalogRoles
        ? Promise.resolve(catalogRoles.serviceCenters)
        : loadCatalogRoles().then((r) => r.serviceCenters),
    ),
    settled(fetchEmployees()),
    role === "ADMIN" || role === "DISTRIBUTOR" || role === "TECHNICIAN"
      ? settled(fetchPrinters())
      : Promise.resolve(null),
    can(role, "users", "read") ? settled(fetchUsers()) : Promise.resolve(null),
    can(role, "contracts", "read")
      ? settled(
          Promise.all([
            fetchDistributorContracts(),
            fetchServiceCenterContracts(),
          ]),
        )
      : Promise.resolve(null),
  ]);

  const companies = companiesP.ok ? companiesP.value : [];
  const branches = branchesP.ok ? branchesP.value : [];
  const clients = clientsP.ok ? clientsP.value : [];
  const distributors = distributorsP.ok ? distributorsP.value : [];
  const serviceCenters = serviceCentersP.ok ? serviceCentersP.value : [];
  const employeesRaw = employeesP.ok ? employeesP.value : [];

  if (!companiesP.ok) loadWarnings.push("No se pudieron cargar las empresas.");
  if (!branchesP.ok) loadWarnings.push("No se pudieron cargar las empresas.");
  if (!employeesP.ok) loadWarnings.push("No se pudieron cargar los empleados.");
  if (printersP && !printersP.ok) {
    loadWarnings.push("No se pudieron cargar las impresoras.");
  }

  const branchIds = branchIdsFromScope(scope, branches);
  const companyIds = scope?.companyIds ?? new Set(companies.map((c) => c.id));
  const scopedBranches =
    branchIds.size > 0
      ? branches.filter((b) => branchIds.has(b.id))
      : branches;
  const scopedClients = filterByBranchScope(clients, branchIds, role);
  const scopedDistributors = filterByBranchScope(
    distributors,
    branchIds,
    role,
  );
  const scopedServiceCenters = filterByBranchScope(
    serviceCenters,
    branchIds,
    role,
  );
  const employees = filterEmployeesInScope(
    employeesRaw,
    companyIds,
    role,
    userBranchId,
    branches,
  );

  let printers: PrinterResponse[] = [];
  if (printersP?.ok) {
    printers = filterPrintersForUser(printersP.value, role, distributorId);
  }

  let users: number | null = null;
  if (usersP?.ok) {
    users = usersP.value.filter((u) => u.enabled).length;
  }

  let activeContracts: number | null = null;
  if (contractsP?.ok) {
    const [distributorContracts, serviceCenterContracts] = contractsP.value;
    activeContracts = [
      ...distributorContracts,
      ...serviceCenterContracts,
    ].filter((c) => contractStatus(c.startDate, c.endDate) === "active").length;
  }

  const stats = buildStats(role, {
    companies,
    branches: scopedBranches,
    clients: scopedClients.length,
    distributors: scopedDistributors.length,
    serviceCenters: scopedServiceCenters.length,
    employees: employees.length,
    printers,
    users,
    activeContracts,
  });

  const printerStatusCounts = countPrintersByStatus(printers, role);
  const monthlyStatusMix =
    role === "DISTRIBUTOR" ? printersStatusMixByMonth(printers) : undefined;
  const monthlySales =
    role === "DISTRIBUTOR" ? distributorSalesByMonth(printers) : undefined;
  const monthlyPrinterRegistrations = printersByMonth(printers);
  const recentPrinters = [...printers]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt, "es"))
    .slice(0, 6);

  const activity = buildActivity(printers, employees, scopedBranches);

  return {
    stats: stats.slice(0, 4).map(withStatHref),
    printers,
    printerStatusCounts,
    monthlyPrinterRegistrations,
    monthlyStatusMix,
    monthlySales,
    recentPrinters,
    activity,
    loadWarnings,
  };
}
