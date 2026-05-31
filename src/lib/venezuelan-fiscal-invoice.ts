import { normalizeRif } from "@/lib/seniat-extract";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";

export type VenezuelanFiscalInvoiceData = {
  seniatLabel: "SENIAT";
  rif: string;
  businessName: string;
  address: string;
  fiscalSerial: string;
  invoiceNumber: string;
  issuedAt: Date;
  itemDescription: string;
  quantity: number;
  subtotalFormatted: string;
  taxFormatted: string;
  totalFormatted: string;
};

export function formatRifForFiscalDisplay(raw: string): string {
  const normalized = normalizeRif(raw);
  if (!normalized) return "—";
  const letter = normalized.charAt(0);
  const digits = normalized.slice(1);
  if (!digits) return normalized;
  return `${letter}-${digits}`;
}

export function formatVenezuelanMoneyAmount(amount: number): string {
  return amount.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function resolveClientRif(
  client: ClientResponse,
  branch: BranchResponse | undefined,
  companies: CompanyResponse[],
): string {
  const embedded = client.companyRif?.trim();
  if (embedded) return formatRifForFiscalDisplay(embedded);
  if (!branch) return "—";
  const company = companies.find((c) => c.id === branch.companyId);
  if (!company?.rif?.trim()) return "—";
  return formatRifForFiscalDisplay(company.rif);
}

function resolveBusinessName(
  client: ClientResponse,
  branch: BranchResponse | undefined,
  companies: CompanyResponse[],
): string {
  const embedded = client.companyBusinessName?.trim();
  if (embedded) return embedded;
  if (!branch) return "—";
  const company = companies.find((c) => c.id === branch.companyId);
  return company?.businessName?.trim() || "—";
}

function resolveClientAddress(branch: BranchResponse | undefined): string {
  if (!branch) return "—";
  const address = branch.address?.trim();
  if (address) return address;
  const location = [branch.city, branch.state].filter(Boolean).join(", ");
  return location || "—";
}

export function buildSimulatedInvoiceNumber(issuedAt: Date): string {
  const y = issuedAt.getFullYear();
  const m = String(issuedAt.getMonth() + 1).padStart(2, "0");
  const d = String(issuedAt.getDate()).padStart(2, "0");
  const t = String(issuedAt.getHours()).padStart(2, "0");
  const min = String(issuedAt.getMinutes()).padStart(2, "0");
  const s = String(issuedAt.getSeconds()).padStart(2, "0");
  return `F${y}${m}${d}-${t}${min}${s}`;
}

export type BuildDispositionInvoiceInput = {
  clientId: number;
  clients: ClientResponse[];
  branches: BranchResponse[];
  companies: CompanyResponse[];
  printer: PrinterResponse;
  issuedAt?: Date;
};

export function buildDispositionInvoiceData(
  input: BuildDispositionInvoiceInput,
): VenezuelanFiscalInvoiceData | null {
  const client = input.clients.find((c) => c.id === input.clientId);
  if (!client) return null;

  const branch = input.branches.find((b) => b.id === client.branchId);
  const issuedAt = input.issuedAt ?? new Date();
  const zero = formatVenezuelanMoneyAmount(0);

  return {
    seniatLabel: "SENIAT",
    rif: resolveClientRif(client, branch, input.companies),
    businessName: resolveBusinessName(client, branch, input.companies),
    address: resolveClientAddress(branch),
    fiscalSerial: input.printer.fiscalSerial.trim() || "—",
    invoiceNumber: buildSimulatedInvoiceNumber(issuedAt),
    issuedAt,
    itemDescription: "ENAJENACION DE EQUIPO FISCAL",
    quantity: 1,
    subtotalFormatted: zero,
    taxFormatted: zero,
    totalFormatted: zero,
  };
}

export function formatFiscalInvoiceDateTime(issuedAt: Date): string {
  return issuedAt.toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
