import { describe, expect, it } from "vitest";
import {
  buildToolsHeaderFooterInvoiceData,
  serializeToolsInvoiceFooter,
  serializeToolsInvoiceHeader,
  toolsInvoiceFooterDirty,
  toolsInvoiceHeaderDirty,
} from "./tools-header-footer-invoice";

describe("tools-header-footer-invoice", () => {
  it("builds invoice draft from header and footer strings", () => {
    const draft = buildToolsHeaderFooterInvoiceData({
      headerContent: "SENIAT\nJ-123\nEMPRESA",
      footerContent: "GRACIAS\nPOR SU COMPRA",
      printerSerial: "GRA0000017",
      issuedAt: new Date("2026-07-27T15:30:00"),
    });

    expect(draft.encabezado.lineas).toEqual(["SENIAT", "J-123", "EMPRESA"]);
    expect(draft.piePagina.mensajes).toEqual(["GRACIAS", "POR SU COMPRA"]);
    expect(draft.piePagina.serialFiscal).toBe("GRA0000017");
    expect(draft.piePagina.codigoImpresora).toBe("GR");
    expect(draft.items[0]?.descripcion).toBe("PRODUCTO DE MUESTRA");
  });

  it("detects dirty header and footer independently", () => {
    const draft = buildToolsHeaderFooterInvoiceData({
      headerContent: "A\nB",
      footerContent: "C",
      printerSerial: "GRA1",
    });
    draft.encabezado.lineas = ["A", "B", "X"];

    expect(toolsInvoiceHeaderDirty(draft, "A\nB")).toBe(true);
    expect(toolsInvoiceFooterDirty(draft, "C")).toBe(false);
    expect(serializeToolsInvoiceHeader(draft)).toBe("A\nB\nX");
    expect(serializeToolsInvoiceFooter(draft)).toBe("C");
  });
});
