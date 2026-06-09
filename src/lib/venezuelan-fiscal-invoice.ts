import { normalizeRif } from "@/lib/seniat-extract";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";

export const FISCAL_TICKET_WIDTH_CH = 68;

const DEFAULT_LOGO_TEXTO = "AEG";
const DEFAULT_TIPO_DOCUMENTO = "DOCUMENTO FISCAL";
const IVA_GENERAL_PORCENTAJE = 16;
const ITEM_ALICUOTA = "G";

export function fiscalTicketSeparator(): string {
  return "-".repeat(FISCAL_TICKET_WIDTH_CH);
}

export type VenezuelanFiscalInvoiceItem = {
  descripcion: string;
  alicuota: string;
  precio: number;
};

export type VenezuelanFiscalInvoiceData = {
  encabezado: {
    logoTexto: string;
    rifEmpresa: string;
    razonSocialEmpresa: string;
    direccionLinea1: string;
    direccionLinea2: string;
    tipoDocumento: string;
    ubicacion: string;
  };
  metadatos: {
    facturaNro: string;
    fecha: string;
    hora: string;
  };
  cliente: {
    rifCi: string;
    razonSocial: string;
    condicion: string;
  };
  items: VenezuelanFiscalInvoiceItem[];
  impuestos: {
    alicuotaGeneralPorcentaje: number;
    baseImponibleG: number;
    ivaG: number;
    subtotal: number;
    ivaTotal: number;
  };
  pagos: {
    formaPago: string;
    montoPagado: number;
    cambio: number;
    totalGeneral: number;
  };
  piePagina: {
    /** Líneas del trailer (antes de códigos de impresora). */
    mensajes: string[];
    codigoImpresora: string;
    serialFiscal: string;
  };
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

function resolveBranchCompany(
  branch: BranchResponse | undefined,
  companies: CompanyResponse[],
): CompanyResponse | undefined {
  if (!branch) return undefined;
  return companies.find((c) => c.id === branch.companyId);
}

function resolveBranchLocation(branch: BranchResponse | undefined): string {
  if (!branch) return "—";
  const city = branch.city?.trim();
  const state = branch.state?.trim();
  if (city && state) return `${city}, ${state}`;
  return city || state || "—";
}

export function splitAddressLines(address: string): [string, string] {
  const trimmed = address.trim();
  if (!trimmed) return ["", ""];
  const commaIndex = trimmed.indexOf(",");
  if (commaIndex > 0) {
    return [
      trimmed.slice(0, commaIndex).trim(),
      trimmed.slice(commaIndex + 1).trim(),
    ];
  }
  if (trimmed.length <= 42) return [trimmed, ""];
  const splitAt = trimmed.lastIndexOf(" ", 42);
  const index = splitAt > 20 ? splitAt : 42;
  return [trimmed.slice(0, index).trim(), trimmed.slice(index).trim()];
}

function resolveCompanyAddress(branch: BranchResponse | undefined): string {
  if (!branch) return "—";
  const address = branch.address?.trim();
  if (address) return address;
  return resolveBranchLocation(branch);
}

export function buildSimulatedInvoiceNumber(
  issuedAt: Date,
  printerId = 0,
): string {
  const seq =
    (printerId * 10_000 +
      issuedAt.getHours() * 100 +
      issuedAt.getMinutes()) %
    100_000_000;
  return String(seq).padStart(8, "0");
}

export function formatFiscalInvoiceDate(issuedAt: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(issuedAt.getDate())}/${pad(issuedAt.getMonth() + 1)}/${issuedAt.getFullYear()}`;
}

export function formatFiscalInvoiceTime(issuedAt: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(issuedAt.getHours())}:${pad(issuedAt.getMinutes())}`;
}

function resolvePrinterCode(fiscalSerial: string): string {
  const letters = fiscalSerial.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return letters.slice(0, 2) || "MH";
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildTaxesFromItemPrice(
  precio: number,
  alicuotaPorcentaje = IVA_GENERAL_PORCENTAJE,
) {
  const baseImponibleG = roundMoney(precio);
  const ivaG = roundMoney((baseImponibleG * alicuotaPorcentaje) / 100);
  const subtotal = baseImponibleG;
  const ivaTotal = ivaG;
  const totalGeneral = roundMoney(subtotal + ivaTotal);
  return {
    alicuotaGeneralPorcentaje: alicuotaPorcentaje,
    baseImponibleG,
    ivaG,
    subtotal,
    ivaTotal,
    totalGeneral,
  };
}

export function syncInvoiceAmounts(
  data: VenezuelanFiscalInvoiceData,
): VenezuelanFiscalInvoiceData {
  const itemPrice = data.items[0]?.precio ?? 0;
  const taxes = buildTaxesFromItemPrice(
    itemPrice,
    data.impuestos.alicuotaGeneralPorcentaje,
  );
  return {
    ...data,
    impuestos: {
      ...data.impuestos,
      baseImponibleG: taxes.baseImponibleG,
      ivaG: taxes.ivaG,
      subtotal: taxes.subtotal,
      ivaTotal: taxes.ivaTotal,
    },
    pagos: {
      ...data.pagos,
      montoPagado: taxes.totalGeneral,
      totalGeneral: taxes.totalGeneral,
    },
  };
}

export function parseFiscalMoneyInput(value: string): number {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return roundMoney(parsed);
}

export type BuildDispositionInvoiceInput = {
  clientId: number;
  clients: ClientResponse[];
  branches: BranchResponse[];
  companies: CompanyResponse[];
  distributors?: DistributorResponse[];
  printer: PrinterResponse;
  issuedAt?: Date;
};

export function buildDispositionInvoiceData(
  input: BuildDispositionInvoiceInput,
): VenezuelanFiscalInvoiceData | null {
  const client = input.clients.find((c) => c.id === input.clientId);
  if (!client) return null;

  const clientBranch = input.branches.find((b) => b.id === client.branchId);
  const issuedAt = input.issuedAt ?? new Date();
  const distributor = input.distributors?.find(
    (row) => row.id === input.printer.distributorId,
  );
  const distributorBranch = distributor
    ? input.branches.find((b) => b.id === distributor.branchId)
    : undefined;
  const distributorCompany = resolveBranchCompany(
    distributorBranch,
    input.companies,
  );
  const [direccionLinea1, direccionLinea2] = splitAddressLines(
    resolveCompanyAddress(distributorBranch),
  );
  const itemPrice = roundMoney(input.printer.finalSalePrice ?? 0);
  const taxes = buildTaxesFromItemPrice(itemPrice);

  return {
    encabezado: {
      logoTexto: DEFAULT_LOGO_TEXTO,
      rifEmpresa: distributorCompany?.rif
        ? formatRifForFiscalDisplay(distributorCompany.rif)
        : "—",
      razonSocialEmpresa:
        distributorCompany?.businessName?.trim() || "—",
      direccionLinea1,
      direccionLinea2,
      tipoDocumento: DEFAULT_TIPO_DOCUMENTO,
      ubicacion: resolveBranchLocation(distributorBranch),
    },
    metadatos: {
      facturaNro: buildSimulatedInvoiceNumber(issuedAt, input.printer.id),
      fecha: formatFiscalInvoiceDate(issuedAt),
      hora: formatFiscalInvoiceTime(issuedAt),
    },
    cliente: {
      rifCi: resolveClientRif(client, clientBranch, input.companies),
      razonSocial: resolveBusinessName(client, clientBranch, input.companies),
      condicion: "contado",
    },
    items: [
      {
        descripcion: "ENAJENACION DE EQUIPO FISCAL",
        alicuota: ITEM_ALICUOTA,
        precio: itemPrice,
      },
    ],
    impuestos: {
      alicuotaGeneralPorcentaje: taxes.alicuotaGeneralPorcentaje,
      baseImponibleG: taxes.baseImponibleG,
      ivaG: taxes.ivaG,
      subtotal: taxes.subtotal,
      ivaTotal: taxes.ivaTotal,
    },
    pagos: {
      formaPago: "CONTADO",
      montoPagado: taxes.totalGeneral,
      cambio: 0,
      totalGeneral: taxes.totalGeneral,
    },
    piePagina: {
      mensajes: ["", ""],
      codigoImpresora: resolvePrinterCode(input.printer.fiscalSerial),
      serialFiscal: input.printer.fiscalSerial.trim() || "—",
    },
  };
}
