import {
  adaptStatusTerminology,
  extractLocation,
  toolsRoleTerminologyKey,
} from "@/modules/tools/shared/formatters";
import type {
  ToolsPrinter,
  ToolsPrinterClientSummary,
} from "@/modules/tools/shared/types";
import { printerModelLabel } from "@/lib/printer-form";
import { printerStatusLabel } from "@/lib/printer-status";
import type { ClientResponse } from "@/types/branch-role";
import type { PrinterModelResponse } from "@/types/printer-model";
import type { PrinterResponse } from "@/types/printer";
import type { Role } from "@/types/user";

export function extractClientSummary(
  client: ClientResponse | null | undefined,
): ToolsPrinterClientSummary | null {
  if (!client) return null;

  return {
    name: client.companyBusinessName?.trim() || "N/A",
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
  role: Role;
}): ToolsPrinter {
  const { printer, client, model, role } = options;
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

  return {
    id: printer.id,
    serial: printer.fiscalSerial,
    macAddress: printer.macAddress?.trim() || null,
    modelo,
    marca,
    estado,
    firmware: printer.versionFirmware?.trim() || "N/A",
    ubicacion,
    rifCliente: client?.companyRif?.trim() || "",
    rifName: client?.companyBusinessName?.trim() || "",
    reporteX: "No disponible",
    clientId: printer.clientId,
    clientSummary,
  };
}

export function mapCorePrintersToTools(options: {
  printers: PrinterResponse[];
  clients: ClientResponse[];
  models: PrinterModelResponse[];
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
