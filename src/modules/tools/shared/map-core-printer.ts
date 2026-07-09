import { formatBranchShort } from "@/lib/branches";
import {
  adaptStatusTerminology,
  extractLocation,
  toolsRoleTerminologyKey,
} from "@/modules/tools/shared/formatters";
import type {
  ToolsPrinter,
  ToolsPrinterPartySummary,
} from "@/modules/tools/shared/types";
import { printerStatusLabel, normalizePrinterStatus } from "@/lib/printer-status";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse } from "@/types/printer";
import type { Role } from "@/types/user";

function companyRifForBranch(
  branchId: number | null | undefined,
  branches: BranchResponse[],
  companies: CompanyResponse[],
): string {
  if (branchId == null) return "";
  const branch = branches.find((b) => b.id === branchId);
  if (!branch) return "";
  return companies.find((c) => c.id === branch.companyId)?.rif?.trim() ?? "";
}

function distributorDisplay(
  distributorId: number | null | undefined,
  distributors: DistributorResponse[],
  branches: BranchResponse[],
  companies: CompanyResponse[],
): ToolsPrinterPartySummary | null {
  if (distributorId == null) return null;
  const distributor = distributors.find((d) => d.id === distributorId);
  if (!distributor) return null;
  const branch = branches.find((b) => b.id === distributor.branchId);
  if (!branch) return null;

  const name = formatBranchShort(branch, companies);
  const rif = companyRifForBranch(branch.id, branches, companies);
  if (!name.trim() && !rif.trim()) return null;

  return {
    name: name.trim() || "N/A",
    rif,
    phone: branch.phone?.trim() || "N/A",
    email: branch.email?.trim() || "N/A",
  };
}

export function extractClientSummary(
  client: ClientResponse | null | undefined,
): ToolsPrinterPartySummary | null {
  if (!client) return null;

  return {
    name: client.companyBusinessName?.trim() || "N/A",
    rif: client.companyRif?.trim() || "",
    phone: client.branchPhone?.trim() || "N/A",
    email: client.branchEmail?.trim() || "N/A",
  };
}

function resolveModelParts(
  printer: PrinterResponse,
  model: PrinterModelResponse | null | undefined,
): { marca: string; modelo: string } {
  if (model) {
    return {
      marca: model.brand.trim(),
      modelo: model.modelCode.trim(),
    };
  }

  return {
    marca: "",
    modelo: `Modelo ${printer.modelId}`,
  };
}

export function mapCorePrinterToTools(options: {
  printer: PrinterResponse;
  client?: ClientResponse | null;
  model?: PrinterModelResponse | null;
  distributors?: DistributorResponse[];
  branches?: BranchResponse[];
  companies?: CompanyResponse[];
  role: Role;
}): ToolsPrinter {
  const {
    printer,
    client,
    model,
    distributors = [],
    branches = [],
    companies = [],
    role,
  } = options;
  const clientSummary = extractClientSummary(client);
  const { marca, modelo } = resolveModelParts(printer, model);
  const estadoBase = printerStatusLabel(printer.status);
  const estado = adaptStatusTerminology(
    estadoBase,
    toolsRoleTerminologyKey(role),
  );
  const ubicacion = extractLocation({
    branchState: client?.branchState,
    branchCity: client?.branchCity,
    branchAddress: client?.branchAddress,
  });
  const ciudad = client?.branchCity?.trim() || "";
  const distributor = distributorDisplay(
    printer.distributorId,
    distributors,
    branches,
    companies,
  );

  return {
    id: printer.id,
    serial: printer.fiscalSerial,
    macAddress: printer.macAddress?.trim() || null,
    modelo,
    marca,
    estado,
    status: normalizePrinterStatus(printer.status),
    firmware: printer.versionFirmware?.trim() || "N/A",
    ubicacion,
    ciudad,
    rifCliente: client?.companyRif?.trim() || "",
    rifName: client?.companyBusinessName?.trim() || "",
    distributorName: distributor?.name ?? "",
    distributorRif: distributor?.rif ?? "",
    distributorSummary: distributor,
    reporteX: "No disponible",
    clientId: printer.clientId,
    clientSummary,
  };
}

export function mapCorePrintersToTools(options: {
  printers: PrinterResponse[];
  clients: ClientResponse[];
  models: PrinterModelResponse[];
  distributors?: DistributorResponse[];
  branches?: BranchResponse[];
  companies?: CompanyResponse[];
  role: Role;
}): ToolsPrinter[] {
  const clientById = new Map(options.clients.map((client) => [client.id, client]));
  const modelById = new Map(options.models.map((model) => [model.id, model]));

  return options.printers.map((printer) =>
    mapCorePrinterToTools({
      printer,
      client:
        printer.clientId != null
          ? clientById.get(printer.clientId) ?? null
          : null,
      model: modelById.get(printer.modelId) ?? null,
      distributors: options.distributors,
      branches: options.branches,
      companies: options.companies,
      role: options.role,
    }),
  );
}

export function findToolsPrinterBySerial(
  printers: ToolsPrinter[],
  serial: string,
): ToolsPrinter | null {
  const normalized = serial.trim().toUpperCase();
  return (
    printers.find((printer) => printer.serial.toUpperCase() === normalized) ??
    null
  );
}
