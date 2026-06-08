import type { CompanyScope } from "@/lib/company-scope";
import {
  buildFiscalPrinterSummary,
  isValidFiscalSearchQuery,
  type FiscalBookCatalog,
} from "@/lib/fiscal-book/map-fiscal-printer";
import type {
  FiscalBookSearchResult,
  FiscalBookSearchType,
  FiscalPrinter,
} from "@/lib/fiscal-book/types";
import { filterPrintersForUser } from "@/lib/scope-filters";
import { resolveCompanyByRif } from "@/lib/companies-api";
import { fetchBranches } from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import { fetchPrinters } from "@/lib/printers-api";
import { fetchSoftware } from "@/lib/software-api";
import { normalizeRif } from "@/lib/seniat-extract";
import type { PrinterResponse } from "@/types/printer";
import type { Role } from "@/types/user";

export type SearchFiscalPrintersOptions = {
  role: Role;
  scope: CompanyScope | null;
  distributorId: number | null;
};

async function loadSearchCatalog(
  scope: CompanyScope | null,
): Promise<FiscalBookCatalog> {
  const [companies, branches, clients, distributors, models, software] =
    await Promise.all([
      scope ? Promise.resolve(scope.companies) : fetchCompanies(),
      scope ? Promise.resolve(scope.branches) : fetchBranches(),
      fetchClients().catch(() => []),
      fetchDistributors().catch(() => []),
      fetchPrinterModels().catch(() => []),
      fetchSoftware().catch(() => []),
    ]);

  return {
    companies,
    branches,
    clients,
    distributors,
    serviceCenters: [],
    employees: [],
    technicians: [],
    models,
    software,
  };
}

function scopedPrinters(
  printers: PrinterResponse[],
  options: SearchFiscalPrintersOptions,
): PrinterResponse[] {
  return filterPrintersForUser(
    printers,
    options.role,
    options.distributorId,
  );
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const from = (page - 1) * pageSize;
  return items.slice(from, from + pageSize);
}

export async function searchFiscalPrinters(
  query: string,
  type: FiscalBookSearchType,
  page: number,
  pageSize: number,
  options: SearchFiscalPrintersOptions,
): Promise<FiscalBookSearchResult> {
  const normalized = query.trim().toUpperCase();
  if (!isValidFiscalSearchQuery(normalized, type)) {
    return { data: [], count: 0 };
  }

  const [printersRaw, catalog] = await Promise.all([
    fetchPrinters(),
    loadSearchCatalog(options.scope),
  ]);
  const printers = scopedPrinters(printersRaw, options);

  let matched: PrinterResponse[] = [];

  if (type === "serial") {
    matched = printers.filter((p) => p.fiscalSerial === normalized);
  } else {
    const rif = normalizeRif(normalized);
    let company =
      catalog.companies.find(
        (c) => normalizeRif(c.rif) === rif,
      ) ?? null;
    if (!company) {
      company = await resolveCompanyByRif(rif).catch(() => null);
      if (company && !catalog.companies.some((c) => c.id === company!.id)) {
        catalog.companies = [...catalog.companies, company];
      }
    }
    if (!company) {
      return { data: [], count: 0 };
    }
    const branchIds = new Set(
      catalog.branches
        .filter((b) => b.companyId === company!.id)
        .map((b) => b.id),
    );
    const clientIds = new Set(
      catalog.clients
        .filter((c) => branchIds.has(c.branchId))
        .map((c) => c.id),
    );
    matched = printers.filter(
      (p) => p.clientId != null && clientIds.has(p.clientId),
    );
  }

  const count = matched.length;
  const pageRows = paginate(matched, page, pageSize);
  const data: FiscalPrinter[] = pageRows.map((printer) =>
    buildFiscalPrinterSummary(printer, catalog),
  );

  return { data, count };
}
