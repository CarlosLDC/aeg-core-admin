import { describe, expect, it } from "vitest";
import {
  applyPrinterTicketToDispositionInvoice,
  extractEnajenacionHeaderLines,
  extractEnajenacionTicketFromInvoice,
  extractEnajenacionTrailerLines,
} from "@/lib/enajenacion-ticket";
import type { VenezuelanFiscalInvoiceData } from "@/lib/venezuelan-fiscal-invoice";

describe("enajenacion-ticket", () => {
  it("omits blank second address line in header extraction", () => {
    expect(
      extractEnajenacionHeaderLines(
        [
          "SENIAT",
          "J-503752890",
          "ABASTO HERMANOS YEISAR 2023, C.A.",
          "AV SANTA CRUZ LOCAL NRO 13 SECTOR POZUELOS",
          "",
          "PUERTO LA CRUZ, ANZOATEGUI",
        ],
        "ordinario",
      ),
    ).toEqual([
      "AV SANTA CRUZ LOCAL NRO 13 SECTOR POZUELOS",
      "PUERTO LA CRUZ, ANZOATEGUI",
      "CONTRIBUYENTE ORDINARIO",
    ]);
  });

  it("keeps custom header lines added after address block", () => {
    expect(
      extractEnajenacionHeaderLines(
        [
          "SENIAT",
          "J-503752890",
          "ABASTO HERMANOS YEISAR 2023, C.A.",
          "AV SANTA CRUZ LOCAL NRO 13 SECTOR POZUELOS",
          "",
          "PUERTO LA CRUZ, ANZOATEGUI",
          "LINEA DE EJEMPLO HEADER",
        ],
        "ordinario",
      ),
    ).toEqual([
      "AV SANTA CRUZ LOCAL NRO 13 SECTOR POZUELOS",
      "PUERTO LA CRUZ, ANZOATEGUI",
      "LINEA DE EJEMPLO HEADER",
      "CONTRIBUYENTE ORDINARIO",
    ]);
  });

  it("extracts trailer lines without blanks", () => {
    expect(extractEnajenacionTrailerLines(["PIE 01", " ", "PIE 02"])).toEqual([
      "PIE 01",
      "PIE 02",
    ]);
  });

  it("extracts header and trailer from invoice draft", () => {
    const invoice: VenezuelanFiscalInvoiceData = {
      encoding: "ISO-8859-2",
      encabezado: {
        lineas: [
          "SENIAT",
          "J-503752890",
          "ABASTO HERMANOS YEISAR 2023, C.A.",
          "AV SANTA CRUZ LOCAL NRO 13 SECTOR POZUELOS",
          "",
          "PUERTO LA CRUZ, ANZOATEGUI",
        ],
      },
      metadatos: { facturaNro: "00000001", fecha: "16/06/2026", hora: "10:00:00" },
      cliente: { rifCi: "J-503752890", razonSocial: "ABASTO", condicion: "contado" },
      items: [],
      impuestos: {
        alicuotaGeneralPorcentaje: 16,
        baseImponibleG: 0,
        ivaG: 0,
        subtotal: 0,
        ivaTotal: 0,
      },
      pagos: { formaPago: "CONTADO", montoPagado: 0, cambio: 0, totalGeneral: 0 },
      piePagina: {
        mensajes: ["GRACIAS POR SU COMPRA"],
        codigoImpresora: "GRA0000017",
        serialFiscal: "GRA0000017",
      },
    };

    expect(extractEnajenacionTicketFromInvoice(invoice, "ordinario")).toEqual({
      header: {
        lines: [
          "AV SANTA CRUZ LOCAL NRO 13 SECTOR POZUELOS",
          "PUERTO LA CRUZ, ANZOATEGUI",
          "CONTRIBUYENTE ORDINARIO",
        ],
      },
      trailer: { lines: ["GRACIAS POR SU COMPRA"] },
    });
  });

  it("restores saved ticket into disposition invoice draft", () => {
    const invoice: VenezuelanFiscalInvoiceData = {
      encoding: "ISO-8859-2",
      encabezado: {
        lineas: [
          "SENIAT",
          "J-503752890",
          "ABASTO HERMANOS YEISAR 2023, C.A.",
          "AV SANTA CRUZ LOCAL NRO 13 SECTOR POZUELOS",
          "",
          "PUERTO LA CRUZ, ANZOATEGUI",
        ],
      },
      metadatos: { facturaNro: "00000001", fecha: "16/06/2026", hora: "10:00:00" },
      cliente: { rifCi: "J-503752890", razonSocial: "ABASTO", condicion: "contado" },
      items: [],
      impuestos: {
        alicuotaGeneralPorcentaje: 16,
        baseImponibleG: 0,
        ivaG: 0,
        subtotal: 0,
        ivaTotal: 0,
      },
      pagos: { formaPago: "CONTADO", montoPagado: 0, cambio: 0, totalGeneral: 0 },
      piePagina: {
        mensajes: [],
        codigoImpresora: "GRA0000017",
        serialFiscal: "GRA0000017",
      },
    };

    const restored = applyPrinterTicketToDispositionInvoice(
      invoice,
      {
        lines: [
          "AV SANTA CRUZ LOCAL NRO 13 SECTOR POZUELOS",
          "PUERTO LA CRUZ, ANZOATEGUI",
          "LINEA DE EJEMPLO HEADER",
          "CONTRIBUYENTE ORDINARIO",
        ],
      },
      { lines: ["PIE DE EJEMPLO"] },
      "ordinario",
    );

    expect(restored.encabezado.lineas).toEqual([
      "SENIAT",
      "J-503752890",
      "ABASTO HERMANOS YEISAR 2023, C.A.",
      "AV SANTA CRUZ LOCAL NRO 13 SECTOR POZUELOS",
      "",
      "PUERTO LA CRUZ, ANZOATEGUI",
      "LINEA DE EJEMPLO HEADER",
    ]);
    expect(restored.piePagina.mensajes).toEqual(["PIE DE EJEMPLO"]);
    expect(extractEnajenacionTicketFromInvoice(restored, "ordinario")).toEqual({
      header: {
        lines: [
          "AV SANTA CRUZ LOCAL NRO 13 SECTOR POZUELOS",
          "PUERTO LA CRUZ, ANZOATEGUI",
          "LINEA DE EJEMPLO HEADER",
          "CONTRIBUYENTE ORDINARIO",
        ],
      },
      trailer: { lines: ["PIE DE EJEMPLO"] },
    });
  });
});
