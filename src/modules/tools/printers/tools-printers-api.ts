import { fetchBranches } from "@/lib/branches-api";
import { fetchClients } from "@/lib/clients-api";
import { fetchCompanies } from "@/lib/companies-api";
import { fetchDistributors } from "@/lib/distributors-api";
import { fetchPrinterModels } from "@/lib/printer-models-api";
import { fetchPrinters } from "@/lib/printers-api";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse } from "@/types/printer";

export type ToolsPrinterCatalog = {
  printers: PrinterResponse[];
  clients: ClientResponse[];
  models: PrinterModelResponse[];
  distributors: DistributorResponse[];
  branches: BranchResponse[];
  companies: CompanyResponse[];
};

export async function loadToolsPrinterCatalog(): Promise<ToolsPrinterCatalog> {
  const [printers, clients, models, distributors, branches, companies] =
    await Promise.all([
      fetchPrinters(),
      fetchClients().catch(() => [] as ClientResponse[]),
      fetchPrinterModels().catch(() => [] as PrinterModelResponse[]),
      fetchDistributors().catch(() => [] as DistributorResponse[]),
      fetchBranches().catch(() => [] as BranchResponse[]),
      fetchCompanies().catch(() => [] as CompanyResponse[]),
    ]);

  return { printers, clients, models, distributors, branches, companies };
}
