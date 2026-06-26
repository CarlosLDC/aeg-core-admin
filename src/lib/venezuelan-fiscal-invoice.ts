import {
  FISCAL_TICKET_CHARSET,
  encodeLatin2,
  normalizeFiscalTicketText,
} from "@/lib/fiscal-ticket-latin2";
import { normalizeRif } from "@/lib/seniat-extract";

export { FISCAL_TICKET_CHARSET } from "@/lib/fiscal-ticket-latin2";
export { encodeLatin2, normalizeFiscalTicketText } from "@/lib/fiscal-ticket-latin2";
import type { BranchResponse } from "@/types/branch";
import type { ClientResponse, DistributorResponse } from "@/types/branch-role";
import type { CompanyResponse, ContributorType } from "@/types/company";
import type { PrinterResponse } from "@/types/printer";

const CONTRIBUTOR_TYPE_HEADER_LINES = new Set([
  "CONTRIBUYENTE ORDINARIO",
  "CONTRIBUYENTE ESPECIAL",
  "CONTRIBUYENTE FORMAL",
]);

export function contributorTypeFiscalLine(
  contributorType: ContributorType | string,
): string {
  switch (contributorType) {
    case "especial":
      return "CONTRIBUYENTE ESPECIAL";
    case "formal":
      return "CONTRIBUYENTE FORMAL";
    case "ordinario":
    default:
      return "CONTRIBUYENTE ORDINARIO";
  }
}

export function isContributorTypeHeaderLine(line: string): boolean {
  return CONTRIBUTOR_TYPE_HEADER_LINES.has(
    normalizeFiscalTicketText(line.trim()).toUpperCase(),
  );
}

export const FISCAL_TICKET_WIDTH_CH = 68;
export const INVOICE_PRODUCT_SINGLE_LINE_MAX_LENGTH = 39;
export const INVOICE_PRODUCT_MULTI_LINE_MAX_LENGTH = 60;
export const INVOICE_PRODUCT_MAX_LINES = 5;

const IVA_GENERAL_PORCENTAJE = 16;
const ITEM_ALICUOTA = "G";

export function fiscalTicketSeparator(): string {
  return "-".repeat(FISCAL_TICKET_WIDTH_CH);
}

function truncateInvoiceProductLine(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength);
}

export function splitInvoiceProductDescriptionLines(
  productDescription?: string,
  defaultDescription = "PRODUCTO",
): string[] {
  const raw = productDescription?.trim() || defaultDescription;
  const sourceLines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (sourceLines.length === 0) {
    return [
      truncateInvoiceProductLine(
        normalizeFiscalTicketText(defaultDescription),
        INVOICE_PRODUCT_SINGLE_LINE_MAX_LENGTH,
      ),
    ];
  }

  if (sourceLines.length === 1) {
    return [
      truncateInvoiceProductLine(
        normalizeFiscalTicketText(sourceLines[0]),
        INVOICE_PRODUCT_SINGLE_LINE_MAX_LENGTH,
      ),
    ];
  }

  return sourceLines
    .slice(0, INVOICE_PRODUCT_MAX_LINES)
    .map((line) =>
      truncateInvoiceProductLine(
        normalizeFiscalTicketText(line),
        INVOICE_PRODUCT_MULTI_LINE_MAX_LENGTH,
      ),
    );
}

export function invoiceProductDescriptionLinesForProf(
  descriptionLines: string[],
): string[] {
  if (descriptionLines.length === 0) {
    return ["", "", "", "", ""];
  }
  const singleLine = descriptionLines.length === 1;
  return Array.from({ length: INVOICE_PRODUCT_MAX_LINES }, (_, index) => {
    if (singleLine) {
      return descriptionLines[0];
    }
    return index < descriptionLines.length ? descriptionLines[index] : "";
  });
}

export function buildEncabezadoLineas(input: {
  rifEmpresa: string;
  razonSocialEmpresa: string;
  direccionLinea1: string;
  direccionLinea2: string;
  ubicacion: string;
  contributorType?: ContributorType | string;
}): string[] {
  const lines = [
    "SENIAT",
    input.rifEmpresa,
    input.razonSocialEmpresa,
    input.direccionLinea1,
    input.direccionLinea2,
    input.ubicacion,
  ];
  if (input.contributorType != null) {
    lines.push(contributorTypeFiscalLine(input.contributorType));
  }
  return lines;
}

export type VenezuelanFiscalInvoiceItem = {
  descripcion: string;
  alicuota: string;
  precio: number;
};

export type VenezuelanFiscalInvoiceData = {
  encoding: typeof FISCAL_TICKET_CHARSET;
  encabezado: {
    /** Líneas centradas del encabezado fiscal (logo, SENIAT, RIF, etc.). */
    lineas: string[];
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
    /** Líneas del pie de ticket (antes de códigos de impresora). */
    mensajes: string[];
    codigoImpresora: string;
    serialFiscal: string;
  };
};

export function formatRifForFiscalDisplay(raw: string): string {
  const normalized = normalizeRif(raw);
  if (!normalized) return "-";
  const letter = normalized.charAt(0);
  const digits = normalized.slice(1);
  if (!digits) return normalized;
  return `${letter}-${digits}`;
}

export function formatVenezuelanMoneyAmount(amount: number): string {
  return normalizeFiscalTicketText(
    amount.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
}

export function resolveClientCompanyRif(
  client: ClientResponse,
  branch: BranchResponse | undefined,
  companies: CompanyResponse[],
): string {
  const embedded = client.companyRif?.trim();
  if (embedded) return formatRifForFiscalDisplay(embedded);
  if (!branch) return "-";
  const company = companies.find((c) => c.id === branch.companyId);
  if (!company?.rif?.trim()) return "-";
  return formatRifForFiscalDisplay(company.rif);
}

export function resolveClientCompanyName(
  client: ClientResponse,
  branch: BranchResponse | undefined,
  companies: CompanyResponse[],
): string {
  const embedded = client.companyBusinessName?.trim();
  if (embedded) return embedded;
  if (!branch) return "-";
  const company = companies.find((c) => c.id === branch.companyId);
  return company?.businessName?.trim() || "-";
}

export function resolveClientContributorType(
  client: ClientResponse,
  branch: BranchResponse | undefined,
  companies: CompanyResponse[],
): ContributorType {
  if (!branch) return "ordinario";
  const company = companies.find((c) => c.id === branch.companyId);
  return company?.contributorType ?? "ordinario";
}

function resolveBranchCompany(
  branch: BranchResponse | undefined,
  companies: CompanyResponse[],
): CompanyResponse | undefined {
  if (!branch) return undefined;
  return companies.find((c) => c.id === branch.companyId);
}

function resolveBranchLocation(branch: BranchResponse | undefined): string {
  if (!branch) return "-";
  const city = branch.city?.trim();
  const state = branch.state?.trim();
  if (city && state) return `${city}, ${state}`;
  return city || state || "-";
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
  if (!branch) return "-";
  const address = branch.address?.trim();
  if (address) return address;
  return resolveBranchLocation(branch);
}

export function normalizeFacturaNroInput(value: string): string {
  return value.trim();
}

export function validateFacturaNroInput(value: string): string | null {
  const normalized = normalizeFacturaNroInput(value);
  if (!normalized) return "Ingresa el número de factura.";
  if (normalized.length > 20) {
    return "El número de factura no puede superar 20 caracteres.";
  }
  return null;
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

function normalizeStringFields<T extends Record<string, unknown>>(value: T): T {
  const next: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value)) {
    if (typeof field === "string") {
      next[key] = normalizeFiscalTicketText(field);
    } else if (Array.isArray(field)) {
      next[key] = field.map((entry) =>
        typeof entry === "string" ? normalizeFiscalTicketText(entry) : entry,
      );
    } else {
      next[key] = field;
    }
  }
  return next as T;
}

export function normalizeFiscalInvoiceData(
  data: VenezuelanFiscalInvoiceData,
): VenezuelanFiscalInvoiceData {
  return {
    ...data,
    encoding: FISCAL_TICKET_CHARSET,
    encabezado: normalizeStringFields(data.encabezado),
    metadatos: normalizeStringFields(data.metadatos),
    cliente: normalizeStringFields(data.cliente),
    items: data.items.map((item) => normalizeStringFields(item)),
    pagos: normalizeStringFields(data.pagos),
    piePagina: normalizeStringFields(data.piePagina),
  };
}

function padTicketLine(left: string, right: string, width = FISCAL_TICKET_WIDTH_CH): string {
  const available = Math.max(1, width - right.length);
  const clippedLeft =
    left.length > available ? left.slice(0, available) : left;
  return `${clippedLeft}${" ".repeat(Math.max(1, width - clippedLeft.length - right.length))}${right}`;
}

/** Serializa la factura como texto plano de ticket fiscal (68 columnas). */
export function serializeFiscalInvoiceTicketText(
  data: VenezuelanFiscalInvoiceData,
): string {
  const normalized = normalizeFiscalInvoiceData(data);
  const item = normalized.items[0];
  const lines: string[] = [];

  for (const line of normalized.encabezado.lineas) {
    if (line.trim()) lines.push(line);
  }

  lines.push(
    padTicketLine("FACTURA #:", normalized.metadatos.facturaNro),
    padTicketLine(
      `FECHA: ${normalized.metadatos.fecha}`,
      `HORA: ${normalized.metadatos.hora}`,
    ),
    fiscalTicketSeparator(),
    "DATOS DEL CLIENTE",
    `RIF/CI: ${normalized.cliente.rifCi}`,
    `RAZON SOCIAL: ${normalized.cliente.razonSocial}`,
    normalized.cliente.condicion,
    fiscalTicketSeparator(),
  );

  if (item) {
    const amount = `Bs ${formatVenezuelanMoneyAmount(item.precio)}`;
    lines.push(
      padTicketLine(`${item.descripcion}         (${item.alicuota})`, amount),
    );
  }

  lines.push(
    fiscalTicketSeparator(),
    padTicketLine(
      `BI ${item?.alicuota ?? "G"} (${normalized.impuestos.alicuotaGeneralPorcentaje.toFixed(2)}%)`,
      `Bs ${formatVenezuelanMoneyAmount(normalized.impuestos.baseImponibleG)}`,
    ),
    padTicketLine(
      `IVA ${item?.alicuota ?? "G"} (${normalized.impuestos.alicuotaGeneralPorcentaje.toFixed(2)}%)`,
      `Bs ${formatVenezuelanMoneyAmount(normalized.impuestos.ivaG)}`,
    ),
    fiscalTicketSeparator(),
    padTicketLine(
      "SUBTTL",
      `Bs ${formatVenezuelanMoneyAmount(normalized.impuestos.subtotal)}`,
    ),
    padTicketLine(
      "IVA",
      `Bs ${formatVenezuelanMoneyAmount(normalized.impuestos.ivaTotal)}`,
    ),
    fiscalTicketSeparator(),
    "FORMA DE PAGO",
    padTicketLine(
      normalized.pagos.formaPago,
      `Bs ${formatVenezuelanMoneyAmount(normalized.pagos.montoPagado)}`,
    ),
    padTicketLine(
      "CAMBIO",
      `Bs ${formatVenezuelanMoneyAmount(normalized.pagos.cambio)}`,
    ),
    fiscalTicketSeparator(),
    padTicketLine(
      "TOTAL",
      `Bs ${formatVenezuelanMoneyAmount(normalized.pagos.totalGeneral)}`,
    ),
    fiscalTicketSeparator(),
  );

  for (const message of normalized.piePagina.mensajes) {
    if (message.trim()) lines.push(message);
  }

  if (normalized.piePagina.mensajes.some((message) => message.trim())) {
    lines.push(fiscalTicketSeparator());
  }

  lines.push(
    padTicketLine(
      normalized.piePagina.codigoImpresora,
      normalized.piePagina.serialFiscal,
    ),
  );

  return lines.join("\n");
}

export function encodeFiscalInvoiceLatin2(
  data: VenezuelanFiscalInvoiceData,
): Uint8Array {
  return encodeLatin2(serializeFiscalInvoiceTicketText(data));
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
  facturaNro?: string;
};

export function buildDispositionInvoiceData(
  input: BuildDispositionInvoiceInput,
): VenezuelanFiscalInvoiceData | null {
  const client = input.clients.find((c) => c.id === input.clientId);
  if (!client) return null;

  const clientBranch = input.branches.find((b) => b.id === client.branchId);
  const issuedAt = input.issuedAt ?? new Date();
  const [direccionLinea1, direccionLinea2] = splitAddressLines(
    resolveCompanyAddress(clientBranch),
  );
  const itemPrice = roundMoney(input.printer.finalSalePrice ?? 0);
  const taxes = buildTaxesFromItemPrice(itemPrice);

  const rifEmpresa = resolveClientCompanyRif(
    client,
    clientBranch,
    input.companies,
  );
  const razonSocialEmpresa = resolveClientCompanyName(
    client,
    clientBranch,
    input.companies,
  );
  const contributorType = resolveClientContributorType(
    client,
    clientBranch,
    input.companies,
  );

  return normalizeFiscalInvoiceData({
    encoding: FISCAL_TICKET_CHARSET,
    encabezado: {
      lineas: buildEncabezadoLineas({
        rifEmpresa,
        razonSocialEmpresa,
        direccionLinea1,
        direccionLinea2,
        ubicacion: resolveBranchLocation(clientBranch),
        contributorType,
      }),
    },
    metadatos: {
      facturaNro:
        input.facturaNro != null && input.facturaNro.trim()
          ? normalizeFacturaNroInput(input.facturaNro)
          : buildSimulatedInvoiceNumber(issuedAt, input.printer.id),
      fecha: formatFiscalInvoiceDate(issuedAt),
      hora: formatFiscalInvoiceTime(issuedAt),
    },
    cliente: {
      rifCi: resolveClientCompanyRif(client, clientBranch, input.companies),
      razonSocial: resolveClientCompanyName(
        client,
        clientBranch,
        input.companies,
      ),
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
      mensajes: [],
      codigoImpresora: resolvePrinterCode(input.printer.fiscalSerial),
      serialFiscal: input.printer.fiscalSerial.trim() || "-",
    },
  });
}
