import {
  FISCAL_TICKET_CHARSET,
  formatFiscalInvoiceDate,
  formatFiscalInvoiceTime,
  normalizeFiscalInvoiceData,
  type VenezuelanFiscalInvoiceData,
} from "@/lib/venezuelan-fiscal-invoice";
import {
  parseToolsHeaderFooterContent,
  serializeToolsHeaderFooterLines,
  toolsHeaderFooterLinesEqual,
} from "@/lib/tools-header-footer-lines";

const SAMPLE_ITEM_PRICE = 100;
const SAMPLE_IVA_RATE = 16;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildSampleTaxes(precio: number) {
  const baseImponibleG = roundMoney(precio);
  const ivaG = roundMoney((baseImponibleG * SAMPLE_IVA_RATE) / 100);
  const subtotal = baseImponibleG;
  const ivaTotal = ivaG;
  const totalGeneral = roundMoney(subtotal + ivaTotal);
  return {
    alicuotaGeneralPorcentaje: SAMPLE_IVA_RATE,
    baseImponibleG,
    ivaG,
    subtotal,
    ivaTotal,
    totalGeneral,
  };
}

function resolvePrinterCode(serial: string): string {
  const letters = serial.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return letters.slice(0, 2) || "MH";
}

export type BuildToolsHeaderFooterInvoiceInput = {
  headerContent: string;
  footerContent: string;
  printerSerial: string;
  issuedAt?: Date;
};

/** Builds a photorealistic invoice draft with real header/footer and sample body. */
export function buildToolsHeaderFooterInvoiceData(
  input: BuildToolsHeaderFooterInvoiceInput,
): VenezuelanFiscalInvoiceData {
  const issuedAt = input.issuedAt ?? new Date();
  const taxes = buildSampleTaxes(SAMPLE_ITEM_PRICE);
  const serial = input.printerSerial.trim() || "-";

  return normalizeFiscalInvoiceData({
    encoding: FISCAL_TICKET_CHARSET,
    encabezado: {
      lineas: parseToolsHeaderFooterContent(input.headerContent),
    },
    metadatos: {
      facturaNro: "00000000",
      fecha: formatFiscalInvoiceDate(issuedAt),
      hora: formatFiscalInvoiceTime(issuedAt),
    },
    cliente: {
      rifCi: "J-00000000-0",
      razonSocial: "CLIENTE DE MUESTRA",
      condicion: "contado",
    },
    items: [
      {
        descripcion: "PRODUCTO DE MUESTRA",
        alicuota: "G",
        precio: SAMPLE_ITEM_PRICE,
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
      mensajes: parseToolsHeaderFooterContent(input.footerContent),
      codigoImpresora: resolvePrinterCode(serial),
      serialFiscal: serial,
    },
  });
}

export function serializeToolsInvoiceHeader(
  data: VenezuelanFiscalInvoiceData,
): string {
  return serializeToolsHeaderFooterLines(data.encabezado.lineas);
}

export function serializeToolsInvoiceFooter(
  data: VenezuelanFiscalInvoiceData,
): string {
  return serializeToolsHeaderFooterLines(data.piePagina.mensajes);
}

export function toolsInvoiceHeaderDirty(
  draft: VenezuelanFiscalInvoiceData,
  baselineHeader: string,
): boolean {
  return !toolsHeaderFooterLinesEqual(
    draft.encabezado.lineas,
    parseToolsHeaderFooterContent(baselineHeader),
  );
}

export function toolsInvoiceFooterDirty(
  draft: VenezuelanFiscalInvoiceData,
  baselineFooter: string,
): boolean {
  return !toolsHeaderFooterLinesEqual(
    draft.piePagina.mensajes,
    parseToolsHeaderFooterContent(baselineFooter),
  );
}
