import type { CompanyScope } from "@/lib/company-scope";
import {
  buildFiscalPrinter,
  type FiscalBookCatalog,
} from "@/lib/fiscal-book/map-fiscal-printer";
import type { FiscalPrinter } from "@/lib/fiscal-book/types";
import { assertPrinterInScope } from "@/lib/permissions/scope-access";
import { fetchAnnualInspections } from "@/lib/annual-inspections-api";
import { fetchBranches } from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchEmployees } from "@/lib/employees-api";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import { fetchPrinterById } from "@/lib/printers-api";
import { fetchSeals } from "@/lib/seals-api";
import { fetchServiceCenters } from "@/lib/service-centers-api";
import { fetchSoftware } from "@/lib/software-api";
import { fetchTechnicalServices } from "@/lib/technical-services-api";
import { fetchTechnicians } from "@/lib/technicians-api";
import {
  filterAnnualInspectionsInScope,
  filterSealsByPrinterScope,
  filterTechnicalServicesInScope,
} from "@/lib/scope-filters";
import type { Role } from "@/types/user";

export type LoadFiscalPrinterOptions = {
  role: Role;
  scope: CompanyScope | null;
  distributorId: number | null;
  userBranchId: number | null;
};

async function loadCatalog(scope: CompanyScope | null): Promise<FiscalBookCatalog> {
  const [
    companies,
    branches,
    clients,
    distributors,
    serviceCenters,
    employees,
    technicians,
    models,
    software,
  ] = await Promise.all([
    scope ? Promise.resolve(scope.companies) : fetchCompanies(),
    scope ? Promise.resolve(scope.branches) : fetchBranches(),
    fetchClients().catch(() => []),
    fetchDistributors().catch(() => []),
    fetchServiceCenters().catch(() => []),
    fetchEmployees().catch(() => []),
    fetchTechnicians().catch(() => []),
    fetchPrinterModels().catch(() => []),
    fetchSoftware().catch(() => []),
  ]);

  return {
    companies,
    branches,
    clients,
    distributors,
    serviceCenters,
    employees,
    technicians,
    models,
    software,
  };
}

export async function loadFiscalPrinter(
  printerId: number,
  options: LoadFiscalPrinterOptions,
): Promise<FiscalPrinter | null> {
  const { role, scope, distributorId } = options;

  const [printer, catalog, sealsRaw, servicesRaw, inspectionsRaw] =
    await Promise.all([
      fetchPrinterById(printerId),
      loadCatalog(scope),
      fetchSeals().catch(() => []),
      fetchTechnicalServices().catch(() => []),
      fetchAnnualInspections().catch(() => []),
    ]);

  if (
    !assertPrinterInScope(scope, printer, role, distributorId)
  ) {
    return null;
  }

  const printerIds = new Set([printer.id]);
  const employeeIds = new Set(catalog.employees.map((e) => e.id));

  const seals = filterSealsByPrinterScope(
    sealsRaw.filter((s) => s.printerId === printer.id),
    printerIds,
    role,
  );
  const services = filterTechnicalServicesInScope(
    servicesRaw.filter((s) => s.printerId === printer.id),
    printerIds,
    role,
    distributorId,
  );
  const inspections = filterAnnualInspectionsInScope(
    inspectionsRaw.filter((i) => i.printerId === printer.id),
    printerIds,
    employeeIds,
    role,
  );

  return buildFiscalPrinter(
    printer,
    seals,
    services,
    inspections,
    catalog,
  );
}
